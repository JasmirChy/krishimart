import json
import random
import urllib.request
from urllib.error import HTTPError, URLError
from django.conf import settings
from django.core.mail import send_mail
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


def send_otp_via_brevo_api(to_email, recipient_name, otp_code, html_message, plain_message):
    """
    Sends email via Brevo's HTTPS REST API over Port 443.
    This bypasses Render's firewall which blocks outbound SMTP ports 25, 465, and 587.
    """
    raw_key = (
        config("BREVO_API_KEY", default="")
        or getattr(settings, "BREVO_API_KEY", "")
        or config("EMAIL_HOST_PASSWORD", default="")
        or getattr(settings, "EMAIL_HOST_PASSWORD", "")
    ).strip()

    if not raw_key:
        return False, "BREVO_API_KEY is not configured"

    # Auto-decode if the user pasted the Base64 JSON token from Brevo
    if raw_key.startswith("ey"):
        try:
            import base64
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
        "subject": f"Your KrishiMart Nepal Security Passcode: {otp_code}",
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


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Registration successful! Your account is now pending Admin verification.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        action_type = request.data.get("action")

        # 1. SEND 6-DIGIT EMAIL OTP WITH PROFESSIONAL HTML TEMPLATE
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

            recipient_name = user.full_name or "KrishiMart User"
            subject = f"Your KrishiMart Nepal Security Passcode: {otp_code}"

            # Plain-text fallback for basic email clients
            plain_message = (
                f"Namaste {recipient_name},\n\n"
                f"Your 6-digit KrishiMart verification code is: {otp_code}\n\n"
                f"This code will expire in 10 minutes.\n"
                f"If you did not request this code, you can safely ignore this email.\n\n"
                f"KrishiMart Nepal • Empowering Local Farmers\n"
                f"Dhangadhi Hub, Kailali & Kathmandu Valley\n"
                f"https://krishimart-gold.vercel.app/"
            )

            # Professional, high-deliverability HTML email template
            html_message = f"""
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{subject}</title>
              </head>
              <body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
                        <!-- Brand Header -->
                        <tr>
                          <td style="background-color: #14532D; padding: 28px 24px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                              🌱 KrishiMart Nepal
                            </h1>
                            <p style="margin: 4px 0 0 0; color: #a7f3d0; font-size: 12px; font-weight: 500;">
                              किसान र उपभोक्ता जोड्ने डिजिटल बजार
                            </p>
                          </td>
                        </tr>
                        <!-- Body Content -->
                        <tr>
                          <td style="padding: 32px 28px 24px 28px; text-align: center;">
                            <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                              Password Reset Verification
                            </h2>
                            <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                              Namaste <strong>{recipient_name}</strong>, we received a request to verify your identity. Enter the 6-digit code below to reset your password:
                            </p>
                            <!-- Large OTP Code Display -->
                            <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 18px 24px; margin: 0 auto 20px auto; display: inline-block;">
                              <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #14532D; font-family: monospace;">
                                {otp_code}
                              </span>
                            </div>
                            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                              ⏱️ Valid for 10 minutes only
                            </p>
                            <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94a3b8;">
                              If you did not make this request, someone may have mistyped their email. No changes will be made to your account.
                            </p>
                          </td>
                        </tr>
                        <!-- Verified Footer -->
                        <tr>
                          <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 24px; text-align: center;">
                            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #14532D;">
                              ✓ KrishiMart Official System Notification
                            </p>
                            <p style="margin: 0; font-size: 10px; color: #64748b; line-height: 1.4;">
                              Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
                              Helpline: +977-1-4423456 • krishimart.support@gmail.com
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """

            # 1. Try sending via Brevo's HTTPS REST API over Port 443 (Render Cloud Safe)
            sent, info = send_otp_via_brevo_api(email, recipient_name, otp_code, html_message, plain_message)
            if not sent:
                print(f"[Brevo HTTPS API notice]: {info}")
                # Only use SMTP fallback when running locally (DEBUG=True).
                # On Render (DEBUG=False), outbound ports 25, 465, 587 are blocked and cause a 3-4 minute freeze!
                if getattr(settings, "DEBUG", False):
                    try:
                        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "krishimart.support@gmail.com")
                        send_mail(
                            subject=subject,
                            message=plain_message,
                            from_email=from_email,
                            recipient_list=[email],
                            html_message=html_message,
                            fail_silently=False,
                        )
                    except Exception as mail_err:
                        print(f"[OTP Mail Delivery Fallback] To: {email} | OTP: {otp_code} | Error: {mail_err}")
                else:
                    return Response(
                        {"error": f"Email delivery error: {info}. Please verify BREVO_API_KEY in Render."},
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
                    "message": "Password reset successfully! You can now sign in with your new password."
                },
                status=status.HTTP_200_OK,
            )

        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

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

    @action(detail=True, methods=["post"])
    def toggle_verification(self, request, pk=None):
        user = self.get_object()
        user.is_admin_verified = not user.is_admin_verified
        user.save()
        status_label = "verified" if user.is_admin_verified else "unverified"
        return Response(
            {
                "message": f"User {user.full_name} is now {status_label}.",
                "user": UserSerializer(user).data,
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