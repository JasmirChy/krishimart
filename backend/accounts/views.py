import base64
import json
import mimetypes
import random
import threading
import urllib.request
from urllib.error import HTTPError, URLError
from django.conf import settings
from django.core.mail import send_mail
from django.db import connection
from django.shortcuts import render
from django.utils import timezone
from decouple import config
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsSiteAdmin
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

# In-memory OTP storage: { "user_email": { "code": "123456", "expires_at": timestamp } }
PASSWORD_RESET_OTPS = {}

# In-memory cache backed by PostgreSQL table `krishimart_media_store` so avatars survive Render container restarts
USER_AVATAR_CACHE = {}
_MEDIA_TABLE_READY = False


def _ensure_media_table():
    global _MEDIA_TABLE_READY
    if _MEDIA_TABLE_READY:
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS krishimart_media_store (
                    media_key VARCHAR(120) PRIMARY KEY,
                    data_uri TEXT NOT NULL
                );
                """
            )
            cursor.execute(
                "SELECT media_key, data_uri FROM krishimart_media_store WHERE media_key LIKE 'user_avatar_%';"
            )
            for mkey, duri in cursor.fetchall():
                try:
                    uid = int(str(mkey).replace("user_avatar_", ""))
                    if duri:
                        USER_AVATAR_CACHE[uid] = duri
                except Exception:
                    pass
        _MEDIA_TABLE_READY = True
    except Exception as e:
        print(f"[Media Store Init Notice]: {e}")


def save_user_avatar_to_db(user_id, data_uri):
    if not user_id or not data_uri or not str(data_uri).startswith("data:image/"):
        return
    _ensure_media_table()
    uid = int(user_id)
    USER_AVATAR_CACHE[uid] = str(data_uri)
    mkey = f"user_avatar_{uid}"
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM krishimart_media_store WHERE media_key = %s;",
                [mkey],
            )
            cursor.execute(
                "INSERT INTO krishimart_media_store (media_key, data_uri) VALUES (%s, %s);",
                [mkey, str(data_uri)],
            )
    except Exception as e:
        print(f"[Media Store Save Notice]: {e}")


def file_to_data_uri(uploaded_file):
    try:
        uploaded_file.seek(0)
        raw_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        if not raw_bytes:
            return None
        mime, _ = mimetypes.guess_type(getattr(uploaded_file, "name", "") or "avatar.jpg")
        if not mime or not mime.startswith("image/"):
            mime = "image/jpeg"
        b64 = base64.b64encode(raw_bytes).decode("ascii")
        return f"data:{mime};base64,{b64}"
    except Exception:
        return None


def enrich_user_payload(user_data, user_obj=None):
    """
    Ensures user's profile_picture is always available on mobile & desktop (even after Render container restarts)
    by serving the PostgreSQL-persisted data:image/... URI or upgrading insecure http:// links to https://.
    """
    if not isinstance(user_data, dict):
        return user_data
    _ensure_media_table()
    uid = user_data.get("id") or (getattr(user_obj, "id", None) if user_obj else None)
    if uid:
        uid = int(uid)
        cached_uri = USER_AVATAR_CACHE.get(uid)
        if cached_uri:
            user_data["profile_picture"] = cached_uri
            return user_data

        # If not yet in PostgreSQL media store, check if the file still exists on local disk and back it up
        if user_obj and getattr(user_obj, "profile_picture", None):
            try:
                duri = file_to_data_uri(user_obj.profile_picture.file)
                if duri:
                    save_user_avatar_to_db(uid, duri)
                    user_data["profile_picture"] = duri
                    return user_data
            except Exception:
                pass

    pic = user_data.get("profile_picture")
    if isinstance(pic, str) and pic.startswith("http://") and "onrender.com" in pic:
        user_data["profile_picture"] = pic.replace("http://", "https://", 1)
    return user_data


# Official KrishiMart Google Apps Script Web App URL (Port 443 HTTPS -> Native Gmail Delivery)
DEFAULT_GOOGLE_SCRIPT_URL = (
    "https://script.google.com/macros/s/AKfycby54qvMjU39dehVbkysaL16Z2qEpfvo_txYzaDJ9tzZsqBz98IWtEuEs-mXUDBVMuQr/exec"
)
GOOGLE_SCRIPT_WEBHOOK_URL = (
    config("GOOGLE_SCRIPT_WEBHOOK_URL", default=DEFAULT_GOOGLE_SCRIPT_URL).strip()
    or DEFAULT_GOOGLE_SCRIPT_URL
)


def send_otp_via_google_script(to_email, subject, html_message, plain_message):
    """
    Sends an email over Port 443 HTTPS to the KrishiMart Google Apps Script Web App,
    which dispatches the email natively from krishimart.support@gmail.com via Gmail's own servers
    (100% SPF/DKIM/DMARC pass -> Primary Inbox delivery on both localhost and Render).
    """
    if not GOOGLE_SCRIPT_WEBHOOK_URL:
        return False, "GOOGLE_SCRIPT_WEBHOOK_URL not configured"

    payload = {
        "to": str(to_email).strip(),
        "subject": subject,
        "text": plain_message,
        "html": html_message,
    }

    req = urllib.request.Request(
        GOOGLE_SCRIPT_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode("utf-8", errors="ignore")
            if '"status":"error"' in res_body or '"status": "error"' in res_body:
                return False, f"Google Script error: {res_body}"
            return True, res_body
    except HTTPError as e:
        if e.code in (200, 201, 301, 302, 303, 307, 308):
            return True, f"Sent via Google Script (HTTP {e.code})"
        err_body = e.read().decode("utf-8", errors="ignore")
        return False, f"Google Script HTTP {e.code}: {err_body}"
    except URLError as e:
        return False, f"Google Script Network Error: {e.reason}"
    except Exception as e:
        return False, str(e)


def send_otp_via_brevo_api(to_email, recipient_name, otp_code, html_message, plain_message):
    """
    Backup sender via Brevo's HTTPS REST API over Port 443.
    """
    raw_key = (
        config("BREVO_API_KEY", default="")
        or getattr(settings, "BREVO_API_KEY", "")
        or config("EMAIL_HOST_PASSWORD", default="")
        or getattr(settings, "EMAIL_HOST_PASSWORD", "")
    ).strip()

    if not raw_key:
        return False, "BREVO_API_KEY is not configured"

    if raw_key.startswith("ey"):
        try:
            decoded_json = json.loads(base64.b64decode(raw_key).decode("utf-8"))
            api_key = decoded_json.get("api_key", raw_key)
        except Exception:
            api_key = raw_key
    else:
        api_key = raw_key

    url = "https://api.brevo.com/v3/smtp/email"
    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", "krishimart.support@gmail.com")
    if "<" in sender_email and ">" in sender_email:
        sender_email = sender_email.split("<")[1].split(">")[0].strip()
    if "@" not in sender_email or "smtp-brevo.com" in sender_email:
        sender_email = "krishimart.support@gmail.com"

    payload = {
        "sender": {
            "name": "KrishiMart Nepal",
            "email": sender_email,
        },
        "to": [
            {
                "email": to_email,
                "name": recipient_name,
            }
        ],
        "subject": f"Your KrishiMart Verification Code: {otp_code}",
        "htmlContent": html_message,
        "textContent": plain_message,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": api_key.strip(),
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            return True, res_body
    except HTTPError as e:
        err_body = e.read().decode("utf-8")
        return False, f"Brevo API HTTP {e.code}: {err_body}"
    except URLError as e:
        return False, f"Brevo API Network Error: {e.reason}"
    except Exception as e:
        return False, str(e)


def send_account_verification_email_async(user):
    """
    Sends a clean KrishiMart HTML card email in a background thread when the Admin
    approves (or pauses) a user's account verification in the Admin Panel.
    NOTE: Avoids external *.vercel.app links inside the email body so Gmail's anti-phishing
    scanner never routes the message to Spam (matching the exact Primary Inbox receipt format).
    """
    to_email = getattr(user, "email", None)
    if not to_email or "@" not in str(to_email):
        return

    full_name = getattr(user, "full_name", None) or "KrishiMart Member"
    role = (getattr(user, "role", "CUSTOMER") or "CUSTOMER").upper()
    phone = getattr(user, "phone_number", None) or "—"
    location = getattr(user, "location", None) or "Nepal"
    is_verified = bool(getattr(user, "is_admin_verified", False))

    if is_verified:
        subject = f"Your KrishiMart Account #KM-USR-{user.id} is Approved!"
        headline = "KrishiMart Account Verified & Active"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "✓ ACCOUNT APPROVED"
        if role == "FARMER":
            role_desc = (
                f"Namaste <strong>{full_name}</strong>, great news! Your KrishiMart <strong>Farmer</strong> "
                f"profile has been reviewed and approved by our Admin team. You can now submit wholesale "
                f"harvest batches, track your procurement slips, and order fresh produce."
            )
        else:
            role_desc = (
                f"Namaste <strong>{full_name}</strong>, great news! Your KrishiMart <strong>Customer</strong> "
                f"profile has been reviewed and approved by our Admin team. You can now order farm-fresh "
                f"produce directly from Nepali growers and download 1/4 A4 order receipts."
            )
        status_text = "Active & Approved"
        status_html = '<span style="color: #14532D; font-weight: 800;">✓ Active & Approved</span>'
        closing_note = "You can now access all verified marketplace features under your account on <strong>KrishiMart</strong>."
    else:
        subject = f"Update: Your KrishiMart Account #KM-USR-{user.id} Status"
        headline = "Account Verification Paused"
        badge_bg, badge_border, badge_color = "#fef2f2", "#dc2626", "#991b1b"
        badge_text = "✕ VERIFICATION PAUSED"
        role_desc = (
            f"Namaste <strong>{full_name}</strong>, your KrishiMart account verification status has "
            f"been paused by our Admin team. Please reach out via Live Chat or our support helpline if you need assistance."
        )
        status_text = "Pending Admin Review"
        status_html = '<span style="color: #b45309; font-weight: 800;">Pending Admin Review</span>'
        closing_note = "If you have questions about your account status, please contact KrishiMart Support."

    plain_message = (
        f"{headline}\n\n"
        f"Member ID: #KM-USR-{user.id}\n"
        f"Account Holder: {full_name}\n"
        f"Account Role: {role}\n"
        f"Status: {status_text}\n"
        f"Location: {location}\n"
        f"Contact Phone: {phone}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
          .card {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
          .header {{ background: #14532D; padding: 24px; text-align: center; color: #ffffff; }}
          .logo {{ font-size: 24px; font-weight: 900; margin: 0; color: #ffffff; }}
          .sub {{ font-size: 12px; color: #a7f3d0; margin-top: 4px; }}
          .content {{ padding: 28px 24px; text-align: center; color: #1e293b; }}
          .footer {{ background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }}
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div class="card" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div class="header" style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 class="logo" style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div class="sub" style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div class="content" style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: {badge_bg}; border: 1.5px dashed {badge_border}; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: {badge_color}; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {role_desc}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Member ID:</strong> #KM-USR-{user.id}</div>
              <div><strong>Account Holder:</strong> {full_name}</div>
              <div><strong>Account Role:</strong> {role}</div>
              <div><strong>Account Status:</strong> {status_html}</div>
              <div><strong>Location:</strong> {location}</div>
              <div><strong>Contact Phone:</strong> {phone}</div>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              {closing_note}
            </p>
          </div>
          <div class="footer" style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    def _worker():
        send_otp_via_google_script(str(to_email).strip(), subject, html_message, plain_message)

    threading.Thread(target=_worker, daemon=True).start()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        avatar_uri = request.data.get("avatar_data_uri")
        if avatar_uri and str(avatar_uri).startswith("data:image/"):
            save_user_avatar_to_db(user.id, avatar_uri)
        elif "profile_picture" in request.FILES:
            duri = file_to_data_uri(request.FILES["profile_picture"])
            if duri:
                save_user_avatar_to_db(user.id, duri)

        user_payload = enrich_user_payload(UserSerializer(user).data, user)
        return Response(
            {
                "message": "Registration successful! Your account is now pending Admin verification.",
                "user": user_payload,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        action_type = request.data.get("action")

        # 1. SEND 6-DIGIT EMAIL OTP WITH THE CLEAN CARD TEMPLATE
        if action_type == "send_otp":
            email = (request.data.get("email") or "").strip().lower()
            if not email:
                return Response(
                    {"error": "Please enter your registered email address."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return Response(
                    {"error": "No KrishiMart account found with this email address."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Generate random 6-digit OTP code
            otp_code = f"{random.randint(100000, 999999)}"
            expiry_timestamp = timezone.now().timestamp() + (10 * 60)  # Valid for 10 minutes
            PASSWORD_RESET_OTPS[email] = {
                "code": otp_code,
                "expires_at": expiry_timestamp,
            }

            recipient_name = user.full_name or "User"
            subject = f"Your KrishiMart Verification Code: {otp_code}"

            plain_message = (
                f"Namaste {recipient_name},\n\n"
                f"We received a request to verify and update your KrishiMart account password. Use the verification code below:\n\n"
                f"   {otp_code}\n\n"
                f"This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.\n\n"
                f"KrishiMart Agricultural Marketplace\n"
                f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
                f"support@krishimart.com.np • +977-1-4423456"
            )

            html_message = f"""
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
                  .card {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
                  .header {{ background: #14532D; padding: 24px; text-align: center; color: #ffffff; }}
                  .logo {{ font-size: 24px; font-weight: 900; margin: 0; color: #ffffff; }}
                  .sub {{ font-size: 12px; color: #a7f3d0; margin-top: 4px; }}
                  .content {{ padding: 32px 24px; text-align: center; color: #1e293b; }}
                  .otp-box {{ background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 16px 24px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #14532D; margin: 24px auto; display: inline-block; }}
                  .footer {{ background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }}
                </style>
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
                <div class="card" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <div class="header" style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
                    <h1 class="logo" style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
                    <div class="sub" style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
                  </div>
                  <div class="content" style="padding: 32px 24px; text-align: center; color: #1e293b;">
                    <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; color: #0f172a;">Password Security Verification</h2>
                    <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                      Namaste <strong>{recipient_name}</strong>, use the 6-digit verification code below to confirm your KrishiMart password change:
                    </p>
                    <div class="otp-box" style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 16px 24px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #14532D; margin: 24px auto; display: inline-block;">{otp_code}</div>
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
                      This code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
                    </p>
                  </div>
                  <div class="footer" style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
                    KrishiMart Agricultural Marketplace<br/>
                    Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
                    support@krishimart.com.np • +977-1-4423456
                  </div>
                </div>
              </body>
            </html>
            """

            sent, info = send_otp_via_google_script(email, subject, html_message, plain_message)
            if not sent:
                print(f"[Google Script notice]: {info}. Trying Brevo HTTPS API backup...")
                sent, info = send_otp_via_brevo_api(email, recipient_name, otp_code, html_message, plain_message)

            if not sent:
                print(f"[OTP Delivery Error]: {info}")
                return Response(
                    {"error": f"Could not deliver verification email: {info}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(
                {
                    "message": f"A 6-digit verification code was sent to {email}. Please check your inbox."
                },
                status=status.HTTP_200_OK,
            )

        # 2. VERIFY OTP AND SET NEW PASSWORD
        if action_type == "verify_otp_and_reset":
            email = (request.data.get("email") or "").strip().lower()
            otp = (request.data.get("otp") or "").strip()
            new_password = request.data.get("new_password") or ""

            if not email or not otp or not new_password:
                return Response(
                    {"error": "Email, 6-digit OTP code, and new password are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(new_password) < 8:
                return Response(
                    {"error": "New password must be at least 8 characters long."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cached = PASSWORD_RESET_OTPS.get(email)
            if not cached:
                return Response(
                    {"error": "No verification code was requested for this email, or it has expired."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if timezone.now().timestamp() > cached["expires_at"]:
                PASSWORD_RESET_OTPS.pop(email, None)
                return Response(
                    {"error": "This verification code has expired. Please request a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if cached["code"] != otp:
                return Response(
                    {"error": "Invalid 6-digit verification code. Please check and try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return Response(
                    {"error": "Account not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            user.set_password(new_password)
            user.save()
            PASSWORD_RESET_OTPS.pop(email, None)

            return Response(
                {
                    "message": "Password updated successfully with 6-digit OTP verification!"
                },
                status=status.HTTP_200_OK,
            )

        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        resp_data = dict(serializer.validated_data)
        if "user" in resp_data and isinstance(resp_data["user"], dict):
            u_obj = User.objects.filter(id=resp_data["user"].get("id")).first()
            resp_data["user"] = enrich_user_payload(resp_data["user"], u_obj)
        return Response(resp_data, status=status.HTTP_200_OK)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(enrich_user_payload(dict(serializer.data), instance))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        # Persist base64 avatar in PostgreSQL so it works across all mobile & desktop devices even after Render restarts
        avatar_uri = request.data.get("avatar_data_uri")
        if avatar_uri and str(avatar_uri).startswith("data:image/"):
            save_user_avatar_to_db(instance.id, avatar_uri)
        elif "profile_picture" in request.FILES:
            duri = file_to_data_uri(request.FILES["profile_picture"])
            if duri:
                save_user_avatar_to_db(instance.id, duri)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(enrich_user_payload(dict(serializer.data), instance))


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action_type = request.data.get("action")
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        otp = (request.data.get("otp") or "").strip()
        skip_current = str(request.data.get("skip_current_password", "")).lower() in ("true", "1", "yes")
        email = (getattr(request.user, "email", "") or "").strip().lower()

        # 1. Step 1: Request 6-digit OTP to change password from Profile Page
        if action_type == "send_otp":
            if not skip_current:
                if not current_password or not request.user.check_password(current_password):
                    return Response(
                        {"error": "Current password is incorrect."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if len(new_password) < 8:
                return Response(
                    {"error": "New password must be at least 8 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not email or "@" not in email:
                return Response(
                    {"error": "No valid email address is linked to your account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp_code = f"{random.randint(100000, 999999)}"
            PASSWORD_RESET_OTPS[email] = {
                "code": otp_code,
                "expires_at": timezone.now().timestamp() + (10 * 60),
            }

            recipient_name = request.user.full_name or "Member"
            subject = f"Your KrishiMart Password Change OTP: {otp_code}"
            plain_message = (
                f"Namaste {recipient_name},\n\n"
                f"Use this 6-digit verification code to confirm changing your KrishiMart password:\n\n"
                f"   {otp_code}\n\n"
                f"Valid for 10 minutes.\n\n"
                f"KrishiMart Agricultural Marketplace\n"
                f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal"
            )
            html_message = f"""
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
                <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
                    <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
                    <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
                  </div>
                  <div style="padding: 32px 24px; text-align: center; color: #1e293b;">
                    <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; color: #0f172a;">Confirm Password Change</h2>
                    <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                      Namaste <strong>{recipient_name}</strong>, enter this 6-digit security code on your Profile page to complete your password update:
                    </p>
                    <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 16px 24px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #14532D; margin: 24px auto; display: inline-block;">{otp_code}</div>
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
                      This code is valid for <strong>10 minutes</strong>.
                    </p>
                  </div>
                  <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
                    KrishiMart Agricultural Marketplace • Dhangadhi Hub, Kailali, Nepal
                  </div>
                </div>
              </body>
            </html>
            """

            sent, info = send_otp_via_google_script(email, subject, html_message, plain_message)
            if not sent:
                sent, info = send_otp_via_brevo_api(email, recipient_name, otp_code, html_message, plain_message)
            if not sent:
                return Response(
                    {"error": f"Could not send verification OTP: {info}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(
                {
                    "message": f"A 6-digit verification code was sent to {email}.",
                    "email": email,
                },
                status=status.HTTP_200_OK,
            )

        # 2. Step 2: Verify 6-digit OTP and update password
        if action_type == "verify_otp_and_change" or otp:
            if len(new_password) < 8:
                return Response(
                    {"error": "New password must be at least 8 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cached = PASSWORD_RESET_OTPS.get(email)
            if not cached:
                return Response(
                    {"error": "No active OTP found for your account. Please request a new 6-digit code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if timezone.now().timestamp() > cached["expires_at"]:
                PASSWORD_RESET_OTPS.pop(email, None)
                return Response(
                    {"error": "This 6-digit OTP code has expired. Please request a new one."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if cached["code"] != otp:
                return Response(
                    {"error": "Invalid 6-digit OTP code. Please check your email and try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            request.user.set_password(new_password)
            request.user.save()
            PASSWORD_RESET_OTPS.pop(email, None)
            return Response({"message": "Password updated successfully with OTP verification!"})

        # 3. Direct fallback if called without OTP
        if not request.user.check_password(current_password):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {"error": "New password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save()
        return Response({"message": "Password updated successfully!"})


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint to list, add, verify/unverify, reset password, update, or delete any user.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSiteAdmin]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        user_map = {u.id: u for u in queryset}
        data = [enrich_user_payload(dict(item), user_map.get(item.get("id"))) for item in serializer.data]
        return Response(data)

    @action(detail=True, methods=["post"])
    def toggle_verification(self, request, pk=None):
        user = self.get_object()
        user.is_admin_verified = not user.is_admin_verified
        user.save()
        status_label = "verified" if user.is_admin_verified else "unverified"

        # Automatically email the user when their account is verified/approved (or paused)
        send_account_verification_email_async(user)

        return Response(
            {
                "message": f"User {user.full_name} is now {status_label}.",
                "user": enrich_user_payload(UserSerializer(user).data, user),
            }
        )

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get("new_password", "").strip()
        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save()
        return Response({"message": f"Password reset for {user.full_name}."})