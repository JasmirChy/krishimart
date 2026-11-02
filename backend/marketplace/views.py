import json
import threading
import urllib.request
from decimal import Decimal
from decouple import config
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdminVerified, IsFarmerOrAdmin, IsSiteAdmin
from .models import (
    Product,
    SellProductSubmission,
    FarmerPurchase,
    Order,
    StoryReview,
)
from .serializers import (
    ProductSerializer,
    SellProductSubmissionSerializer,
    FarmerPurchaseSerializer,
    OrderSerializer,
    StoryReviewSerializer,
)

# Official KrishiMart Google Apps Script Web App URL (Port 443 HTTPS -> Native Gmail Delivery)
GOOGLE_SCRIPT_WEBHOOK_URL = config(
    "GOOGLE_SCRIPT_WEBHOOK_URL",
    default="https://script.google.com/macros/s/AKfycby54qvMjU39dehVbkysaL16Z2qEpfvo_txYzaDJ9tzZsqBz98IWtEuEs-mXUDBVMuQr/exec",
)

import os

DISCOUNT_CACHE_FILE = os.path.join(os.path.dirname(__file__), "order_discounts_cache.json")


def _load_discount_cache():
    try:
        if os.path.exists(DISCOUNT_CACHE_FILE):
            with open(DISCOUNT_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                discounts = {int(k): Decimal(str(v)) for k, v in data.get("discounts", {}).items()}
                sent = {int(x) for x in data.get("sent_orders", [])}
                actual_prices = {
                    int(k): Decimal(str(v))
                    for k, v in data.get("product_actual_prices", {}).items()
                    if str(v).strip()
                }
                review_products = {
                    int(k): v for k, v in data.get("review_products", {}).items()
                }
                return discounts, sent, actual_prices, review_products
    except Exception:
        pass
    return {}, set(), {}, {}


def _save_discount_cache():
    try:
        data = {
            "discounts": {str(k): str(v) for k, v in ORDER_DISCOUNTS.items()},
            "sent_orders": list(CONFIRMED_EMAIL_SENT_ORDERS),
            "product_actual_prices": {str(k): str(v) for k, v in PRODUCT_ACTUAL_PRICES.items()},
            "review_products": {str(k): v for k, v in REVIEW_PRODUCT_MAP.items()},
        }
        with open(DISCOUNT_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


# Tracks applied discount % per order ID, Admin's Actual Price per Product ID, and Product link per Review ID
ORDER_DISCOUNTS, CONFIRMED_EMAIL_SENT_ORDERS, PRODUCT_ACTUAL_PRICES, REVIEW_PRODUCT_MAP = _load_discount_cache()


def send_krishimart_email_async(to_email, subject, html_message, plain_message):
    """
    Sends an email via the KrishiMart Google Apps Script bridge in a background thread
    so Admin actions (Confirm, Deliver, Cancel, Buy from Farmer) return immediately.
    """
    if not to_email or "@" not in str(to_email):
        return

    def _worker():
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
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp.read()
        except Exception as err:
            print(f"[KrishiMart Email Notice] To: {to_email} | {err}")

    threading.Thread(target=_worker, daemon=True).start()


def get_order_original_subtotal(order):
    """
    Returns the true original pre-discount subtotal (unit price * quantity)
    so the main price on the receipt is ALWAYS consistent (e.g. Rs. 900.00).
    """
    product = getattr(order, "product", None)
    if product and getattr(product, "price", None) is not None:
        return (Decimal(str(product.price)) * Decimal(str(order.quantity or 1))).quantize(Decimal("0.01"))
    return Decimal(str(getattr(order, "total_price", 0) or 0)).quantize(Decimal("0.01"))


def send_order_status_email(order, discount_percent=None):
    """
    Sends the clean KrishiMart HTML card email to the customer when their order
    status is CONFIRMED (via apply_discount_and_email), DELIVERED, or CANCELLED.
    """
    buyer = getattr(order, "buyer", None)
    to_email = getattr(buyer, "email", None)
    if not to_email:
        return

    buyer_name = getattr(buyer, "full_name", None) or "Valued Customer"
    product = getattr(order, "product", None)
    product_name = getattr(product, "name", None) or getattr(order, "product_name", "Farm Produce")
    product_unit = getattr(product, "unit", None) or getattr(order, "product_unit", "unit")

    subtotal = get_order_original_subtotal(order)
    qty = Decimal(str(getattr(order, "quantity", 1) or 1))
    unit_price = (subtotal / qty).quantize(Decimal("0.01")) if qty > 0 else subtotal

    # Determine discount percentage
    if discount_percent is not None:
        try:
            disc_pct = max(Decimal("0"), min(Decimal("100"), Decimal(str(discount_percent or 0))))
        except Exception:
            disc_pct = Decimal("0")
        ORDER_DISCOUNTS[order.id] = disc_pct
        _save_discount_cache()
    elif order.id in ORDER_DISCOUNTS:
        disc_pct = ORDER_DISCOUNTS[order.id]
    else:
        disc_pct = Decimal("0")

    disc_amt = ((subtotal * disc_pct) / Decimal("100")).quantize(Decimal("0.01"))
    net_total = (subtotal - disc_amt).quantize(Decimal("0.01"))

    status_val = (getattr(order, "status", "") or "").upper()

    if status_val == "CONFIRMED":
        subject = f"Your KrishiMart Order #KM-ORD-{order.id} is Confirmed!"
        headline = "Order Confirmed & Preparing for Dispatch"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "✓ ORDER CONFIRMED"
        intro_text = (
            f"Namaste <strong>{buyer_name}</strong>, great news! Your KrishiMart order has been "
            f"confirmed by our Admin team and is being prepared for fresh delivery."
        )
    elif status_val == "DELIVERED":
        subject = f"Your KrishiMart Order #KM-ORD-{order.id} Has Been Delivered!"
        headline = "Order Successfully Delivered"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "🎉 ORDER DELIVERED"
        intro_text = (
            f"Namaste <strong>{buyer_name}</strong>, your farm-fresh order from KrishiMart has been "
            f"successfully delivered! Thank you for supporting local Nepali farmers."
        )
    elif status_val == "CANCELLED":
        subject = f"Update: Your KrishiMart Order #KM-ORD-{order.id} Was Cancelled"
        headline = "Order Cancelled"
        badge_bg, badge_border, badge_color = "#fef2f2", "#dc2626", "#991b1b"
        badge_text = "✕ ORDER CANCELLED"
        intro_text = (
            f"Namaste <strong>{buyer_name}</strong>, your KrishiMart order <strong>#KM-ORD-{order.id}</strong> "
            f"for <strong>{product_name}</strong> has been cancelled. If you have any questions, please reach out via Live Chat."
        )
    else:
        return

    clean_address = str(getattr(order, "delivery_address", "") or "Nepal")
    contact_phone = str(getattr(order, "contact_phone", "") or "—")

    # Format pricing rows based on whether a discount was applied
    disc_pct_str = str(int(disc_pct)) if disc_pct == int(disc_pct) else str(disc_pct)
    if disc_pct > Decimal("0"):
        plain_pricing = (
            f"Subtotal Amount: Rs. {subtotal}\n"
            f"Discount ({disc_pct_str}%): - Rs. {disc_amt}\n"
            f"Total Payable (After Discount): Rs. {net_total}\n"
        )
        html_pricing = f"""
              <div><strong>Subtotal Amount:</strong> रु {subtotal}</div>
              <div style="color: #b45309;"><strong>Discount ({disc_pct_str}%):</strong> - रु {disc_amt}</div>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
                <strong>Total Payable (After Discount):</strong> <span style="color: #14532D; font-weight: 900; font-size: 15px;">रु {net_total}</span>
              </div>
        """
    else:
        plain_pricing = f"Total Payable: Rs. {subtotal}\n"
        html_pricing = f"""
              <div><strong>Total Payable:</strong> <span style="color: #14532D; font-weight: 800;">रु {subtotal}</span></div>
        """

    plain_message = (
        f"{headline}\n\n"
        f"Order Receipt: #KM-ORD-{order.id}\n"
        f"Status: {status_val}\n"
        f"Produce Item: {product_name}\n"
        f"Quantity: {order.quantity} {product_unit}\n"
        f"{plain_pricing}"
        f"Delivery Address: {clean_address}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: {badge_bg}; border: 1.5px dashed {badge_border}; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: {badge_color}; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {intro_text}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Order Receipt:</strong> #KM-ORD-{order.id}</div>
              <div><strong>Produce Item:</strong> {product_name}</div>
              <div><strong>Quantity:</strong> {order.quantity} {product_unit} (रु {unit_price}/{product_unit})</div>
              {html_pricing}
              <div><strong>Delivery Address:</strong> {clean_address}</div>
              <div><strong>Contact Phone:</strong> {contact_phone}</div>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              You can view or download your official 1/4 A4 receipt anytime under <strong>My Orders</strong> on KrishiMart.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    send_krishimart_email_async(to_email, subject, html_message, plain_message)


def send_farmer_procurement_email(purchase, is_settlement_update=False):
    """
    Sends the clean KrishiMart HTML card email to the farmer when the Admin
    purchases their harvest batch or marks a pending payout as PAID.
    """
    farmer = getattr(purchase, "farmer", None)
    to_email = getattr(farmer, "email", None)
    if not to_email:
        return

    farmer_name = getattr(farmer, "full_name", None) or "Verified Farmer"

    if is_settlement_update:
        subject = f"Your KrishiMart Farmer Payout (#KM-PUR-{purchase.id}) is Now PAID!"
        headline = "Farmer Payout Settled (PAID)"
        badge_text = "✓ PAYMENT SETTLED"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, your payment for harvest voucher "
            f"<strong>#KM-PUR-{purchase.id}</strong> ({purchase.crop_name}) has been marked as <strong>PAID</strong>."
        )
    else:
        subject = f"KrishiMart Purchased Your Harvest (#KM-PUR-{purchase.id})!"
        headline = "Wholesale Harvest Purchased by KrishiMart"
        badge_text = "🌾 HARVEST PURCHASED"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, KrishiMart Admin has officially purchased your "
            f"harvest batch! Below is your official procurement voucher summary:"
        )

    notes_line = f"<div><strong>Admin Notes:</strong> {purchase.admin_notes}</div>" if purchase.admin_notes else ""

    plain_message = (
        f"{headline}\n\n"
        f"Procurement Voucher: #KM-PUR-{purchase.id}\n"
        f"Crop: {purchase.crop_name} ({purchase.category})\n"
        f"Quantity Purchased: {purchase.quantity} {purchase.unit}\n"
        f"Agreed Wholesale Rate: Rs. {purchase.agreed_wholesale_rate} / {purchase.unit}\n"
        f"Total Payout: Rs. {purchase.total_amount}\n"
        f"Payment Status: {purchase.payment_status} ({purchase.payment_method})\n"
        f"Pickup Location: {purchase.pickup_location}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: #f0fdf4; border: 1.5px dashed #16a34a; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: #14532D; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {intro_text}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Voucher ID:</strong> #KM-PUR-{purchase.id}</div>
              <div><strong>Crop Name:</strong> {purchase.crop_name} ({purchase.category})</div>
              <div><strong>Quantity Sold:</strong> {purchase.quantity} {purchase.unit}</div>
              <div><strong>Wholesale Rate:</strong> रु {purchase.agreed_wholesale_rate} / {purchase.unit}</div>
              <div><strong>Total Payout:</strong> <span style="color: #14532D; font-weight: 800;">रु {purchase.total_amount}</span></div>
              <div><strong>Settlement Status:</strong> {purchase.payment_status} ({purchase.payment_method})</div>
              <div><strong>Pickup Location:</strong> {purchase.pickup_location}</div>
              {notes_line}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              You can view or print your 1/4 A4 procurement slip anytime under <strong>Sold to Admin</strong> on KrishiMart.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    send_krishimart_email_async(to_email, subject, html_message, plain_message)




def send_farmer_offer_status_email(submission):
    """
    Sends a clean KrishiMart HTML card email to the farmer when the Admin
    declines (REJECTED) or approves (APPROVED) their wholesale harvest offer.
    """
    farmer = getattr(submission, "seller", None)
    to_email = getattr(farmer, "email", None)
    if not to_email:
        return

    farmer_name = getattr(farmer, "full_name", None) or "Verified Farmer"
    status_val = (getattr(submission, "status", "") or "").upper()
    remarks = (getattr(submission, "admin_remarks", "") or "").strip()

    if status_val == "REJECTED":
        subject = f"Update: Your KrishiMart Harvest Offer #KM-SUB-{submission.id} ({submission.vegetable_name})"
        headline = "Wholesale Harvest Offer Declined"
        badge_bg, badge_border, badge_color = "#fef2f2", "#dc2626", "#991b1b"
        badge_text = "✕ OFFER DECLINED BY ADMIN"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, thank you for submitting your wholesale harvest "
            f"offer to KrishiMart. Unfortunately, our Admin team could not procure this batch at this time."
        )
    elif status_val == "APPROVED":
        subject = f"Your KrishiMart Harvest Offer #KM-SUB-{submission.id} ({submission.vegetable_name}) is Approved!"
        headline = "Wholesale Harvest Offer Approved"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "✓ OFFER APPROVED"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, our Admin team has reviewed and approved your "
            f"harvest offer for <strong>{submission.vegetable_name}</strong>!"
        )
    else:
        return

    remarks_html = (
        f'<div style="margin-top: 8px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;">'
        f"<strong>Admin Reason / Note:</strong> {remarks}</div>"
        if remarks
        else ""
    )

    plain_message = (
        f"{headline}\n\n"
        f"Offer ID: #KM-SUB-{submission.id}\n"
        f"Crop: {submission.vegetable_name} ({submission.category})\n"
        f"Quantity Offered: {submission.quantity} {submission.unit}\n"
        f"Expected Wholesale Rate: Rs. {submission.expected_price_per_unit} / {submission.unit}\n"
        f"Pickup Location: {submission.pickup_location}\n"
        f"Admin Note: {remarks or '—'}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: {badge_bg}; border: 1.5px dashed {badge_border}; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: {badge_color}; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {intro_text}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Offer Reference:</strong> #KM-SUB-{submission.id}</div>
              <div><strong>Crop Offered:</strong> {submission.vegetable_name} ({submission.category})</div>
              <div><strong>Quantity Offered:</strong> {submission.quantity} {submission.unit}</div>
              <div><strong>Quoted Wholesale Rate:</strong> रु {submission.expected_price_per_unit} / {submission.unit}</div>
              <div><strong>Farm Pickup Location:</strong> {submission.pickup_location}</div>
              {remarks_html}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              You can submit a new harvest batch or chat directly with our Admin team anytime on <strong>KrishiMart</strong>.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    send_krishimart_email_async(to_email, subject, html_message, plain_message)


INITIAL_NEPAL_PRODUCTS = [
    {
        "name": "Organic Kavre Red Cherry Tomatoes",
        "category": "VEGETABLES",
        "price": Decimal("110.00"),
        "unit": "kg",
        "stock_quantity": Decimal("45.00"),
        "origin_location": "Panchkhal, Kavre",
        "description": "Vine-ripened organic cherry tomatoes harvested this morning from Kavre hills.",
    },
    {
        "name": "Original Mustang Marpha Sweet Apples",
        "category": "FRUITS",
        "price": Decimal("280.00"),
        "unit": "kg",
        "stock_quantity": Decimal("120.00"),
        "origin_location": "Marpha, Mustang",
        "description": "Crisp, high-altitude Himalayan apples straight from Marpha orchards.",
    },
    {
        "name": "A-Grade Palpa Red Potatoes",
        "category": "VEGETABLES",
        "price": Decimal("65.00"),
        "unit": "kg",
        "stock_quantity": Decimal("350.00"),
        "origin_location": "Tansen, Palpa",
        "description": "Earthy, nutrient-rich red skin hill potatoes ideal for daily family cooking.",
    },
    {
        "name": "Indigenous Jumla Marsi Brown Rice",
        "category": "GRAINS",
        "price": Decimal("340.00"),
        "unit": "kg",
        "stock_quantity": Decimal("85.00"),
        "origin_location": "Tila, Jumla",
        "description": "Authentic cold-water Himalayan red/brown Marsi rice with high mineral value.",
    },
    {
        "name": "Fresh Crisp Akabare Chili (Dalle)",
        "category": "SPICES",
        "price": Decimal("450.00"),
        "unit": "kg",
        "stock_quantity": Decimal("30.00"),
        "origin_location": "Ilam Hills",
        "description": "Aromatic, fiery round Akabare chilies handpicked from eastern Ilam farms.",
    },
    {
        "name": "Organic Chitwan Cold-Pressed Mustard Oil",
        "category": "DAIRY",
        "price": Decimal("380.00"),
        "unit": "bundle",
        "stock_quantity": Decimal("60.00"),
        "origin_location": "Bharatpur, Chitwan",
        "description": "Traditional wooden-pressed yellow mustard oil from local Chitwan mustard seeds.",
    },
]


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        if not Product.objects.exists():
            for item in INITIAL_NEPAL_PRODUCTS:
                Product.objects.create(**item)
        # Ensure any previously added products with is_available=False become visible
        Product.objects.filter(is_available=False).update(is_available=True)
        return Product.objects.all()

    def _save_product_actual_price(self, product_obj):
        if "actual_price" in self.request.data:
            raw_actual = str(self.request.data.get("actual_price") or "").strip()
            if raw_actual:
                try:
                    val = Decimal(raw_actual).quantize(Decimal("0.01"))
                    if val > Decimal("0"):
                        PRODUCT_ACTUAL_PRICES[product_obj.id] = val
                    else:
                        PRODUCT_ACTUAL_PRICES.pop(product_obj.id, None)
                    _save_discount_cache()
                except Exception:
                    pass
            else:
                PRODUCT_ACTUAL_PRICES.pop(product_obj.id, None)
                _save_discount_cache()

    def _enrich_product_data(self, product_obj, data_dict):
        enriched = dict(data_dict)
        selling_price = Decimal(str(getattr(product_obj, "price", 0) or 0)).quantize(Decimal("0.01"))
        actual_price = PRODUCT_ACTUAL_PRICES.get(product_obj.id)
        if actual_price and actual_price > selling_price:
            disc_pct = int(round(((actual_price - selling_price) / actual_price) * Decimal("100")))
            enriched["actual_price"] = str(actual_price)
            enriched["discount_pct"] = max(1, disc_pct)
        else:
            enriched["actual_price"] = None
            enriched["discount_pct"] = 0
        return enriched

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        products_by_id = {p.id: p for p in queryset}
        enriched_list = [
            self._enrich_product_data(products_by_id[item["id"]], item)
            if item.get("id") in products_by_id
            else item
            for item in serializer.data
        ]
        return Response(enriched_list)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(self._enrich_product_data(instance, serializer.data))

    def perform_create(self, serializer):
        product_obj = serializer.save(is_available=True)
        self._save_product_actual_price(product_obj)

    def perform_update(self, serializer):
        product_obj = serializer.save()
        self._save_product_actual_price(product_obj)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsSiteAdmin()]


class SellProductSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SellProductSubmissionSerializer
    permission_classes = [IsFarmerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return SellProductSubmission.objects.all()
        return SellProductSubmission.objects.filter(seller=user)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def buy_from_farmer(self, request, pk=None):
        submission = self.get_object()

        if submission.status == "BOUGHT":
            return Response(
                {"error": "This harvest batch has already been purchased from the farmer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchased_qty = Decimal(str(request.data.get("quantity", submission.quantity))).quantize(
            Decimal("0.01")
        )
        agreed_rate = Decimal(
            str(request.data.get("agreed_wholesale_rate", submission.expected_price_per_unit))
        ).quantize(Decimal("0.01"))
        total_amount = (purchased_qty * agreed_rate).quantize(Decimal("0.01"))

        payment_method = request.data.get("payment_method", "CASH")
        payment_status = request.data.get("payment_status", "PAID")
        admin_notes = request.data.get("admin_notes", "").strip()
        publish_to_store = bool(request.data.get("publish_to_store", False))
        retail_price = request.data.get("retail_price")

        purchase = FarmerPurchase.objects.create(
            submission=submission,
            farmer=submission.seller,
            crop_name=submission.vegetable_name,
            category=submission.category,
            quantity=purchased_qty,
            unit=submission.unit,
            agreed_wholesale_rate=agreed_rate,
            total_amount=total_amount,
            payment_method=payment_method,
            payment_status=payment_status,
            pickup_location=submission.pickup_location,
            farmer_phone=submission.contact_phone,
            admin_notes=admin_notes,
        )

        submission.status = "BOUGHT"
        submission.admin_remarks = (
            f"Bought by KrishiMart: {purchased_qty} {submission.unit} @ "
            f"रु {agreed_rate}/{submission.unit} (Total: रु {total_amount}). {admin_notes}"
        )
        submission.save()

        if publish_to_store:
            cat_upper = (submission.category or "").upper()
            if "FRUIT" in cat_upper:
                mapped_cat = "FRUITS"
            elif "GRAIN" in cat_upper or "PULSE" in cat_upper:
                mapped_cat = "GRAINS"
            elif "SPICE" in cat_upper or "HERB" in cat_upper:
                mapped_cat = "SPICES"
            elif "DAIRY" in cat_upper or "HONEY" in cat_upper:
                mapped_cat = "DAIRY"
            else:
                mapped_cat = "VEGETABLES"

            final_retail_price = (
                Decimal(str(retail_price)).quantize(Decimal("0.01"))
                if retail_price
                else agreed_rate
            )

            created_prod = Product.objects.create(
                name=submission.vegetable_name,
                category=mapped_cat,
                description=f"{submission.vegetable_description} (Grown by: {submission.seller.full_name})",
                price=final_retail_price,
                unit=submission.unit
                if submission.unit in ["kg", "g", "bundle", "crate", "quintal"]
                else "kg",
                stock_quantity=purchased_qty,
                origin_location=submission.pickup_location,
                image=submission.image,
                is_available=True,
            )
            raw_actual_price = str(request.data.get("actual_price") or "").strip()
            if raw_actual_price:
                try:
                    act_val = Decimal(raw_actual_price).quantize(Decimal("0.01"))
                    if act_val > final_retail_price:
                        PRODUCT_ACTUAL_PRICES[created_prod.id] = act_val
                        _save_discount_cache()
                except Exception:
                    pass

        # Send automated procurement voucher email to the farmer
        send_farmer_procurement_email(purchase, is_settlement_update=False)

        return Response(
            {
                "message": f"Successfully purchased {purchased_qty} {submission.unit} from {submission.seller.full_name}!",
                "purchase": FarmerPurchaseSerializer(purchase).data,
                "submission": SellProductSubmissionSerializer(submission).data,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def review(self, request, pk=None):
        submission = self.get_object()
        new_status = request.data.get("status")
        admin_remarks = request.data.get("admin_remarks", "")

        if new_status not in ["PENDING", "APPROVED", "REJECTED", "BOUGHT"]:
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        submission.status = new_status
        submission.admin_remarks = admin_remarks
        submission.save()

        # Email the farmer when their harvest offer is Declined (REJECTED) or Approved
        if new_status in ["REJECTED", "APPROVED"]:
            send_farmer_offer_status_email(submission)

        return Response(SellProductSubmissionSerializer(submission).data)


class FarmerPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FarmerPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return FarmerPurchase.objects.all()
        return FarmerPurchase.objects.filter(farmer=user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        user = request.user
        if user.is_staff or user.role == "ADMIN":
            purchases = FarmerPurchase.objects.all()
        else:
            purchases = FarmerPurchase.objects.filter(farmer=user)

        total_amount = sum(p.total_amount for p in purchases)
        total_batches = purchases.count()
        return Response({
            "total_amount": total_amount,
            "total_batches": total_batches,
        })

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        purchase = self.get_object()
        purchase.payment_status = "PAID"
        purchase.save()
        # Notify the farmer by email that their pending payout has been settled
        send_farmer_procurement_email(purchase, is_settlement_update=True)
        return Response({"message": "Purchase marked as PAID"})

    @action(detail=True, methods=["post"])
    def remove(self, request, pk=None):
        purchase = self.get_object()
        purchase.delete()
        return Response({"message": "Purchase deleted"})


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminVerified]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return Order.objects.all()
        return Order.objects.filter(buyer=user)

    def _enrich_order_data(self, order_obj, data_dict):
        subtotal = get_order_original_subtotal(order_obj)
        disc_pct = ORDER_DISCOUNTS.get(order_obj.id, Decimal("0"))
        disc_amt = ((subtotal * disc_pct) / Decimal("100")).quantize(Decimal("0.01"))
        net_total = (subtotal - disc_amt).quantize(Decimal("0.01"))
        enriched = dict(data_dict)
        enriched["subtotal_price"] = str(subtotal)
        enriched["discount_percent"] = float(disc_pct)
        enriched["discount_amount"] = str(disc_amt)
        enriched["net_total"] = str(net_total)
        return enriched

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        orders_by_id = {o.id: o for o in queryset}
        enriched_list = [
            self._enrich_order_data(orders_by_id[item["id"]], item)
            if item.get("id") in orders_by_id
            else item
            for item in serializer.data
        ]
        return Response(enriched_list)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(self._enrich_order_data(instance, serializer.data))

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]
        total_price = product.price * quantity

        if product.stock_quantity >= quantity:
            product.stock_quantity -= quantity
        else:
            product.stock_quantity = Decimal("0.00")
        product.save()

        serializer.save(buyer=self.request.user, total_price=total_price)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated_order = serializer.save()

        # Always keep order.total_price equal to the true original subtotal (product.price * quantity)
        # so opening the receipt later never shows a discounted price as the main subtotal!
        true_subtotal = get_order_original_subtotal(updated_order)
        if updated_order.total_price != true_subtotal:
            updated_order.total_price = true_subtotal
            updated_order.save(update_fields=["total_price"])

        if old_status != "CANCELLED" and updated_order.status == "CANCELLED":
            product = updated_order.product
            if product:
                product.stock_quantity += updated_order.quantity
                product.save()

        # For DELIVERED and CANCELLED, send the email immediately on status change.
        # For CONFIRMED, NEVER send email on dropdown change — wait until Admin clicks
        # "Apply Discount & Email Receipt" inside the 1/4 A4 Receipt Modal!
        if old_status != updated_order.status and updated_order.status in ["DELIVERED", "CANCELLED"]:
            send_order_status_email(updated_order)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def apply_discount_and_email(self, request, pk=None):
        """
        Records the Admin's chosen Discount (%) from the 1/4 A4 Receipt Modal
        (WITHOUT overwriting order.total_price in the DB so the main subtotal is always consistent)
        and sends the Confirmed Order email ONE TIME ONLY.
        """
        if not (request.user.is_staff or getattr(request.user, "role", "") == "ADMIN"):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()
        raw_disc = request.data.get("discount_percent", 0)
        try:
            disc_pct = max(Decimal("0"), min(Decimal("100"), Decimal(str(raw_disc or 0))))
        except Exception:
            disc_pct = Decimal("0")

        ORDER_DISCOUNTS[order.id] = disc_pct
        _save_discount_cache()

        # Ensure order.total_price in DB stays as the true original subtotal (e.g. Rs. 900.00)
        subtotal = get_order_original_subtotal(order)
        if order.total_price != subtotal:
            order.total_price = subtotal
            order.save(update_fields=["total_price"])

        disc_amt = ((subtotal * disc_pct) / Decimal("100")).quantize(Decimal("0.01"))
        net_total = (subtotal - disc_amt).quantize(Decimal("0.01"))

        # Send the CONFIRMED email ONLY ONCE per order confirmation
        already_sent = order.id in CONFIRMED_EMAIL_SENT_ORDERS
        if not already_sent:
            send_order_status_email(order, discount_percent=disc_pct)
            CONFIRMED_EMAIL_SENT_ORDERS.add(order.id)
            _save_discount_cache()

        buyer_email = getattr(order.buyer, "email", None) or "customer"
        disc_str = str(int(disc_pct)) if disc_pct == int(disc_pct) else str(disc_pct)

        return Response(
            {
                "message": (
                    f"Discount ({disc_str}%) saved! Confirmation email was already sent to {buyer_email}."
                    if already_sent
                    else f"Confirmed receipt emailed to {buyer_email} (Discount: {disc_str}%, Total Payable: रु {net_total})!"
                ),
                "already_sent": True,
                "order": OrderSerializer(order).data,
                "subtotal": str(subtotal),
                "discount_percent": float(disc_pct),
                "discount_amount": str(disc_amt),
                "net_total": str(net_total),
            }
        )


class StoryReviewViewSet(viewsets.ModelViewSet):
    serializer_class = StoryReviewSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.role == "ADMIN"):
            return StoryReview.objects.all()
        return StoryReview.objects.filter(status="APPROVED")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAdminVerified()]

    def _enrich_review(self, item_dict):
        enriched = dict(item_dict)
        rid = enriched.get("id")
        meta = REVIEW_PRODUCT_MAP.get(rid) or {}
        enriched["product_id"] = meta.get("product_id")
        enriched["product_name"] = meta.get("product_name")
        enriched["order_id"] = meta.get("order_id")
        return enriched

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response([self._enrich_review(item) for item in serializer.data])

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(self._enrich_review(serializer.data))

    def perform_create(self, serializer):
        user = self.request.user
        stype = serializer.validated_data.get("story_type")
        if not stype:
            stype = "FARMER_STORY" if user.role == "FARMER" else "BUYER_REVIEW"

        raw_prod_id = self.request.data.get("product_id")
        raw_prod_name = (self.request.data.get("product_name") or "").strip()
        raw_order_id = self.request.data.get("order_id")

        # If this is a Verified Delivered-Order Product Review, auto-approve so the product's
        # review count and rating update immediately (Admin can still moderate/reject anytime).
        is_verified_product_review = bool(stype == "BUYER_REVIEW" and (raw_prod_id or raw_prod_name))
        initial_status = "APPROVED" if is_verified_product_review else "PENDING"

        story_obj = serializer.save(author=user, story_type=stype, status=initial_status)

        if raw_prod_id or raw_prod_name:
            REVIEW_PRODUCT_MAP[story_obj.id] = {
                "product_id": int(raw_prod_id) if str(raw_prod_id).isdigit() else None,
                "product_name": raw_prod_name,
                "order_id": int(raw_order_id) if str(raw_order_id).isdigit() else None,
            }
            _save_discount_cache()

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def toggle_status(self, request, pk=None):
        story = self.get_object()
        new_status = request.data.get("status")
        if new_status not in ["APPROVED", "REJECTED", "PENDING"]:
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        story.status = new_status
        story.save()
        return Response(self._enrich_review(StoryReviewSerializer(story).data))
    import base64
import mimetypes
from django.db import connection

MEDIA_CACHE = {}
_MARKET_MEDIA_READY = False


def _ensure_market_media_table():
    global _MARKET_MEDIA_READY
    if _MARKET_MEDIA_READY:
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
            cursor.execute("SELECT media_key, data_uri FROM krishimart_media_store;")
            for mkey, duri in cursor.fetchall():
                if mkey and duri:
                    MEDIA_CACHE[str(mkey)] = duri
        _MARKET_MEDIA_READY = True
    except Exception as e:
        print(f"[Market Media Store Notice]: {e}")


def save_media_to_db(media_key, data_uri):
    if not media_key or not data_uri or not str(data_uri).startswith("data:image/"):
        return
    _ensure_market_media_table()
    MEDIA_CACHE[str(media_key)] = str(data_uri)
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM krishimart_media_store WHERE media_key = %s;", [str(media_key)])
            cursor.execute(
                "INSERT INTO krishimart_media_store (media_key, data_uri) VALUES (%s, %s);",
                [str(media_key), str(data_uri)],
            )
    except Exception as e:
        print(f"[Market Media Save Notice]: {e}")


def get_media_from_db(media_key, file_field=None):
    _ensure_market_media_table()
    cached = MEDIA_CACHE.get(str(media_key))
    if cached:
        return cached
    if file_field:
        try:
            f = file_field.file
            f.seek(0)
            raw = f.read()
            f.seek(0)
            if raw:
                mime, _ = mimetypes.guess_type(getattr(file_field, "name", "") or "image.jpg")
                if not mime or not mime.startswith("image/"):
                    mime = "image/jpeg"
                duri = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
                save_media_to_db(media_key, duri)
                return duri
        except Exception:
            pass
    return None


def normalize_url_or_data_uri(url_val):
    if isinstance(url_val, str) and url_val.startswith("http://") and "onrender.com" in url_val:
        return url_val.replace("http://", "https://", 1)
    return url_val

import json
import threading
import urllib.request
from decimal import Decimal
from decouple import config
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsAdminVerified, IsFarmerOrAdmin, IsSiteAdmin
from .models import (
    Product,
    SellProductSubmission,
    FarmerPurchase,
    Order,
    StoryReview,
)
from .serializers import (
    ProductSerializer,
    SellProductSubmissionSerializer,
    FarmerPurchaseSerializer,
    OrderSerializer,
    StoryReviewSerializer,
)

# Official KrishiMart Google Apps Script Web App URL (Port 443 HTTPS -> Native Gmail Delivery)
GOOGLE_SCRIPT_WEBHOOK_URL = config(
    "GOOGLE_SCRIPT_WEBHOOK_URL",
    default="https://script.google.com/macros/s/AKfycby54qvMjU39dehVbkysaL16Z2qEpfvo_txYzaDJ9tzZsqBz98IWtEuEs-mXUDBVMuQr/exec",
)

import os

DISCOUNT_CACHE_FILE = os.path.join(os.path.dirname(__file__), "order_discounts_cache.json")


def _load_discount_cache():
    try:
        if os.path.exists(DISCOUNT_CACHE_FILE):
            with open(DISCOUNT_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                discounts = {int(k): Decimal(str(v)) for k, v in data.get("discounts", {}).items()}
                sent = {int(x) for x in data.get("sent_orders", [])}
                actual_prices = {
                    int(k): Decimal(str(v))
                    for k, v in data.get("product_actual_prices", {}).items()
                    if str(v).strip()
                }
                review_products = {
                    int(k): v for k, v in data.get("review_products", {}).items()
                }
                return discounts, sent, actual_prices, review_products
    except Exception:
        pass
    return {}, set(), {}, {}


def _save_discount_cache():
    try:
        data = {
            "discounts": {str(k): str(v) for k, v in ORDER_DISCOUNTS.items()},
            "sent_orders": list(CONFIRMED_EMAIL_SENT_ORDERS),
            "product_actual_prices": {str(k): str(v) for k, v in PRODUCT_ACTUAL_PRICES.items()},
            "review_products": {str(k): v for k, v in REVIEW_PRODUCT_MAP.items()},
        }
        with open(DISCOUNT_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


# Tracks applied discount % per order ID, Admin's Actual Price per Product ID, and Product link per Review ID
ORDER_DISCOUNTS, CONFIRMED_EMAIL_SENT_ORDERS, PRODUCT_ACTUAL_PRICES, REVIEW_PRODUCT_MAP = _load_discount_cache()


def send_krishimart_email_async(to_email, subject, html_message, plain_message):
    """
    Sends an email via the KrishiMart Google Apps Script bridge in a background thread
    so Admin actions (Confirm, Deliver, Cancel, Buy from Farmer) return immediately.
    """
    if not to_email or "@" not in str(to_email):
        return

    def _worker():
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
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp.read()
        except Exception as err:
            print(f"[KrishiMart Email Notice] To: {to_email} | {err}")

    threading.Thread(target=_worker, daemon=True).start()


def get_order_original_subtotal(order):
    """
    Returns the true original pre-discount subtotal (unit price * quantity)
    so the main price on the receipt is ALWAYS consistent (e.g. Rs. 900.00).
    """
    product = getattr(order, "product", None)
    if product and getattr(product, "price", None) is not None:
        return (Decimal(str(product.price)) * Decimal(str(order.quantity or 1))).quantize(Decimal("0.01"))
    return Decimal(str(getattr(order, "total_price", 0) or 0)).quantize(Decimal("0.01"))


def send_order_status_email(order, discount_percent=None):
    """
    Sends the clean KrishiMart HTML card email to the customer when their order
    status is CONFIRMED (via apply_discount_and_email), DELIVERED, or CANCELLED.
    """
    buyer = getattr(order, "buyer", None)
    to_email = getattr(buyer, "email", None)
    if not to_email:
        return

    buyer_name = getattr(buyer, "full_name", None) or "Valued Customer"
    product = getattr(order, "product", None)
    product_name = getattr(product, "name", None) or getattr(order, "product_name", "Farm Produce")
    product_unit = getattr(product, "unit", None) or getattr(order, "product_unit", "unit")

    subtotal = get_order_original_subtotal(order)
    qty = Decimal(str(getattr(order, "quantity", 1) or 1))
    unit_price = (subtotal / qty).quantize(Decimal("0.01")) if qty > 0 else subtotal

    # Determine discount percentage
    if discount_percent is not None:
        try:
            disc_pct = max(Decimal("0"), min(Decimal("100"), Decimal(str(discount_percent or 0))))
        except Exception:
            disc_pct = Decimal("0")
        ORDER_DISCOUNTS[order.id] = disc_pct
        _save_discount_cache()
    elif order.id in ORDER_DISCOUNTS:
        disc_pct = ORDER_DISCOUNTS[order.id]
    else:
        disc_pct = Decimal("0")

    disc_amt = ((subtotal * disc_pct) / Decimal("100")).quantize(Decimal("0.01"))
    net_total = (subtotal - disc_amt).quantize(Decimal("0.01"))

    status_val = (getattr(order, "status", "") or "").upper()

    if status_val == "CONFIRMED":
        subject = f"Your KrishiMart Order #KM-ORD-{order.id} is Confirmed!"
        headline = "Order Confirmed & Preparing for Dispatch"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "✓ ORDER CONFIRMED"
        intro_text = (
            f"Namaste <strong>{buyer_name}</strong>, great news! Your KrishiMart order has been "
            f"confirmed by our Admin team and is being prepared for fresh delivery."
        )
    elif status_val == "DELIVERED":
        subject = f"Your KrishiMart Order #KM-ORD-{order.id} Has Been Delivered!"
        headline = "Order Successfully Delivered"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "🎉 ORDER DELIVERED"
        intro_text = (
            f"Namaste <strong>{buyer_name}</strong>, your farm-fresh order from KrishiMart has been "
            f"successfully delivered! Thank you for supporting local Nepali farmers."
        )
    elif status_val == "CANCELLED":
        subject = f"Update: Your KrishiMart Order #KM-ORD-{order.id} Was Cancelled"
        headline = "Order Cancelled"
        badge_bg, badge_border, badge_color = "#fef2f2", "#dc2626", "#991b1b"
        badge_text = "✕ ORDER CANCELLED"
        intro_text = (
            f"Namaste <strong>{buyer_name}</strong>, your KrishiMart order <strong>#KM-ORD-{order.id}</strong> "
            f"for <strong>{product_name}</strong> has been cancelled. If you have any questions, please reach out via Live Chat."
        )
    else:
        return

    clean_address = str(getattr(order, "delivery_address", "") or "Nepal")
    contact_phone = str(getattr(order, "contact_phone", "") or "—")

    # Format pricing rows based on whether a discount was applied
    disc_pct_str = str(int(disc_pct)) if disc_pct == int(disc_pct) else str(disc_pct)
    if disc_pct > Decimal("0"):
        plain_pricing = (
            f"Subtotal Amount: Rs. {subtotal}\n"
            f"Discount ({disc_pct_str}%): - Rs. {disc_amt}\n"
            f"Total Payable (After Discount): Rs. {net_total}\n"
        )
        html_pricing = f"""
              <div><strong>Subtotal Amount:</strong> रु {subtotal}</div>
              <div style="color: #b45309;"><strong>Discount ({disc_pct_str}%):</strong> - रु {disc_amt}</div>
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
                <strong>Total Payable (After Discount):</strong> <span style="color: #14532D; font-weight: 900; font-size: 15px;">रु {net_total}</span>
              </div>
        """
    else:
        plain_pricing = f"Total Payable: Rs. {subtotal}\n"
        html_pricing = f"""
              <div><strong>Total Payable:</strong> <span style="color: #14532D; font-weight: 800;">रु {subtotal}</span></div>
        """

    plain_message = (
        f"{headline}\n\n"
        f"Order Receipt: #KM-ORD-{order.id}\n"
        f"Status: {status_val}\n"
        f"Produce Item: {product_name}\n"
        f"Quantity: {order.quantity} {product_unit}\n"
        f"{plain_pricing}"
        f"Delivery Address: {clean_address}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: {badge_bg}; border: 1.5px dashed {badge_border}; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: {badge_color}; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {intro_text}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Order Receipt:</strong> #KM-ORD-{order.id}</div>
              <div><strong>Produce Item:</strong> {product_name}</div>
              <div><strong>Quantity:</strong> {order.quantity} {product_unit} (रु {unit_price}/{product_unit})</div>
              {html_pricing}
              <div><strong>Delivery Address:</strong> {clean_address}</div>
              <div><strong>Contact Phone:</strong> {contact_phone}</div>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              You can view or download your official 1/4 A4 receipt anytime under <strong>My Orders</strong> on KrishiMart.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    send_krishimart_email_async(to_email, subject, html_message, plain_message)


def send_farmer_procurement_email(purchase, is_settlement_update=False):
    """
    Sends the clean KrishiMart HTML card email to the farmer when the Admin
    purchases their harvest batch or marks a pending payout as PAID.
    """
    farmer = getattr(purchase, "farmer", None)
    to_email = getattr(farmer, "email", None)
    if not to_email:
        return

    farmer_name = getattr(farmer, "full_name", None) or "Verified Farmer"

    if is_settlement_update:
        subject = f"Your KrishiMart Farmer Payout (#KM-PUR-{purchase.id}) is Now PAID!"
        headline = "Farmer Payout Settled (PAID)"
        badge_text = "✓ PAYMENT SETTLED"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, your payment for harvest voucher "
            f"<strong>#KM-PUR-{purchase.id}</strong> ({purchase.crop_name}) has been marked as <strong>PAID</strong>."
        )
    else:
        subject = f"KrishiMart Purchased Your Harvest (#KM-PUR-{purchase.id})!"
        headline = "Wholesale Harvest Purchased by KrishiMart"
        badge_text = "🌾 HARVEST PURCHASED"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, KrishiMart Admin has officially purchased your "
            f"harvest batch! Below is your official procurement voucher summary:"
        )

    notes_line = f"<div><strong>Admin Notes:</strong> {purchase.admin_notes}</div>" if purchase.admin_notes else ""

    plain_message = (
        f"{headline}\n\n"
        f"Procurement Voucher: #KM-PUR-{purchase.id}\n"
        f"Crop: {purchase.crop_name} ({purchase.category})\n"
        f"Quantity Purchased: {purchase.quantity} {purchase.unit}\n"
        f"Agreed Wholesale Rate: Rs. {purchase.agreed_wholesale_rate} / {purchase.unit}\n"
        f"Total Payout: Rs. {purchase.total_amount}\n"
        f"Payment Status: {purchase.payment_status} ({purchase.payment_method})\n"
        f"Pickup Location: {purchase.pickup_location}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: #f0fdf4; border: 1.5px dashed #16a34a; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: #14532D; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {intro_text}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Voucher ID:</strong> #KM-PUR-{purchase.id}</div>
              <div><strong>Crop Name:</strong> {purchase.crop_name} ({purchase.category})</div>
              <div><strong>Quantity Sold:</strong> {purchase.quantity} {purchase.unit}</div>
              <div><strong>Wholesale Rate:</strong> रु {purchase.agreed_wholesale_rate} / {purchase.unit}</div>
              <div><strong>Total Payout:</strong> <span style="color: #14532D; font-weight: 800;">रु {purchase.total_amount}</span></div>
              <div><strong>Settlement Status:</strong> {purchase.payment_status} ({purchase.payment_method})</div>
              <div><strong>Pickup Location:</strong> {purchase.pickup_location}</div>
              {notes_line}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              You can view or print your 1/4 A4 procurement slip anytime under <strong>Sold to Admin</strong> on KrishiMart.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    send_krishimart_email_async(to_email, subject, html_message, plain_message)




def send_farmer_offer_status_email(submission):
    """
    Sends a clean KrishiMart HTML card email to the farmer when the Admin
    declines (REJECTED) or approves (APPROVED) their wholesale harvest offer.
    """
    farmer = getattr(submission, "seller", None)
    to_email = getattr(farmer, "email", None)
    if not to_email:
        return

    farmer_name = getattr(farmer, "full_name", None) or "Verified Farmer"
    status_val = (getattr(submission, "status", "") or "").upper()
    remarks = (getattr(submission, "admin_remarks", "") or "").strip()

    if status_val == "REJECTED":
        subject = f"Update: Your KrishiMart Harvest Offer #KM-SUB-{submission.id} ({submission.vegetable_name})"
        headline = "Wholesale Harvest Offer Declined"
        badge_bg, badge_border, badge_color = "#fef2f2", "#dc2626", "#991b1b"
        badge_text = "✕ OFFER DECLINED BY ADMIN"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, thank you for submitting your wholesale harvest "
            f"offer to KrishiMart. Unfortunately, our Admin team could not procure this batch at this time."
        )
    elif status_val == "APPROVED":
        subject = f"Your KrishiMart Harvest Offer #KM-SUB-{submission.id} ({submission.vegetable_name}) is Approved!"
        headline = "Wholesale Harvest Offer Approved"
        badge_bg, badge_border, badge_color = "#f0fdf4", "#16a34a", "#14532D"
        badge_text = "✓ OFFER APPROVED"
        intro_text = (
            f"Namaste <strong>{farmer_name}</strong>, our Admin team has reviewed and approved your "
            f"harvest offer for <strong>{submission.vegetable_name}</strong>!"
        )
    else:
        return

    remarks_html = (
        f'<div style="margin-top: 8px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;">'
        f"<strong>Admin Reason / Note:</strong> {remarks}</div>"
        if remarks
        else ""
    )

    plain_message = (
        f"{headline}\n\n"
        f"Offer ID: #KM-SUB-{submission.id}\n"
        f"Crop: {submission.vegetable_name} ({submission.category})\n"
        f"Quantity Offered: {submission.quantity} {submission.unit}\n"
        f"Expected Wholesale Rate: Rs. {submission.expected_price_per_unit} / {submission.unit}\n"
        f"Pickup Location: {submission.pickup_location}\n"
        f"Admin Note: {remarks or '—'}\n\n"
        f"KrishiMart Agricultural Marketplace\n"
        f"Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal\n"
        f"support@krishimart.com.np • +977-1-4423456"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #14532D; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #ffffff;">🌱 KrishiMart Nepal</h1>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">किसान र उपभोक्ता जोड्ने डिजिटल बजार</div>
          </div>
          <div style="padding: 28px 24px; text-align: center; color: #1e293b;">
            <div style="background: {badge_bg}; border: 1.5px dashed {badge_border}; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 800; color: {badge_color}; display: inline-block; margin-bottom: 14px;">
              {badge_text}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">{headline}</h2>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
              {intro_text}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; line-height: 1.8; color: #334155; margin-bottom: 18px;">
              <div><strong>Offer Reference:</strong> #KM-SUB-{submission.id}</div>
              <div><strong>Crop Offered:</strong> {submission.vegetable_name} ({submission.category})</div>
              <div><strong>Quantity Offered:</strong> {submission.quantity} {submission.unit}</div>
              <div><strong>Quoted Wholesale Rate:</strong> रु {submission.expected_price_per_unit} / {submission.unit}</div>
              <div><strong>Farm Pickup Location:</strong> {submission.pickup_location}</div>
              {remarks_html}
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              You can submit a new harvest batch or chat directly with our Admin team anytime on <strong>KrishiMart</strong>.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
            KrishiMart Agricultural Marketplace<br/>
            Dhangadhi Hub, Kailali & Kathmandu Valley, Nepal<br/>
            support@krishimart.com.np • +977-1-4423456
          </div>
        </div>
      </body>
    </html>
    """

    send_krishimart_email_async(to_email, subject, html_message, plain_message)


INITIAL_NEPAL_PRODUCTS = [
    {
        "name": "Organic Kavre Red Cherry Tomatoes",
        "category": "VEGETABLES",
        "price": Decimal("110.00"),
        "unit": "kg",
        "stock_quantity": Decimal("45.00"),
        "origin_location": "Panchkhal, Kavre",
        "description": "Vine-ripened organic cherry tomatoes harvested this morning from Kavre hills.",
    },
    {
        "name": "Original Mustang Marpha Sweet Apples",
        "category": "FRUITS",
        "price": Decimal("280.00"),
        "unit": "kg",
        "stock_quantity": Decimal("120.00"),
        "origin_location": "Marpha, Mustang",
        "description": "Crisp, high-altitude Himalayan apples straight from Marpha orchards.",
    },
    {
        "name": "A-Grade Palpa Red Potatoes",
        "category": "VEGETABLES",
        "price": Decimal("65.00"),
        "unit": "kg",
        "stock_quantity": Decimal("350.00"),
        "origin_location": "Tansen, Palpa",
        "description": "Earthy, nutrient-rich red skin hill potatoes ideal for daily family cooking.",
    },
    {
        "name": "Indigenous Jumla Marsi Brown Rice",
        "category": "GRAINS",
        "price": Decimal("340.00"),
        "unit": "kg",
        "stock_quantity": Decimal("85.00"),
        "origin_location": "Tila, Jumla",
        "description": "Authentic cold-water Himalayan red/brown Marsi rice with high mineral value.",
    },
    {
        "name": "Fresh Crisp Akabare Chili (Dalle)",
        "category": "SPICES",
        "price": Decimal("450.00"),
        "unit": "kg",
        "stock_quantity": Decimal("30.00"),
        "origin_location": "Ilam Hills",
        "description": "Aromatic, fiery round Akabare chilies handpicked from eastern Ilam farms.",
    },
    {
        "name": "Organic Chitwan Cold-Pressed Mustard Oil",
        "category": "DAIRY",
        "price": Decimal("380.00"),
        "unit": "bundle",
        "stock_quantity": Decimal("60.00"),
        "origin_location": "Bharatpur, Chitwan",
        "description": "Traditional wooden-pressed yellow mustard oil from local Chitwan mustard seeds.",
    },
]


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        if not Product.objects.exists():
            for item in INITIAL_NEPAL_PRODUCTS:
                Product.objects.create(**item)
        # Ensure any previously added products with is_available=False become visible
        Product.objects.filter(is_available=False).update(is_available=True)
        return Product.objects.all()

    def _save_product_actual_price(self, product_obj):
        if "actual_price" in self.request.data:
            raw_actual = str(self.request.data.get("actual_price") or "").strip()
            if raw_actual:
                try:
                    val = Decimal(raw_actual).quantize(Decimal("0.01"))
                    if val > Decimal("0"):
                        PRODUCT_ACTUAL_PRICES[product_obj.id] = val
                    else:
                        PRODUCT_ACTUAL_PRICES.pop(product_obj.id, None)
                    _save_discount_cache()
                except Exception:
                    pass
            else:
                PRODUCT_ACTUAL_PRICES.pop(product_obj.id, None)
                _save_discount_cache()

    def _enrich_product_data(self, product_obj, data_dict):
        enriched = dict(data_dict)
        selling_price = Decimal(str(getattr(product_obj, "price", 0) or 0)).quantize(Decimal("0.01"))
        actual_price = PRODUCT_ACTUAL_PRICES.get(product_obj.id)
        if actual_price and actual_price > selling_price:
            disc_pct = int(round(((actual_price - selling_price) / actual_price) * Decimal("100")))
            enriched["actual_price"] = str(actual_price)
            enriched["discount_pct"] = max(1, disc_pct)
        else:
            enriched["actual_price"] = None
            enriched["discount_pct"] = 0

        stored_img = get_media_from_db(f"product_img_{product_obj.id}", getattr(product_obj, "image", None))
        if stored_img:
            enriched["image"] = stored_img
        else:
            enriched["image"] = normalize_url_or_data_uri(enriched.get("image"))
        return enriched

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        products_by_id = {p.id: p for p in queryset}
        enriched_list = [
            self._enrich_product_data(products_by_id[item["id"]], item)
            if item.get("id") in products_by_id
            else item
            for item in serializer.data
        ]
        return Response(enriched_list)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(self._enrich_product_data(instance, serializer.data))

    def _persist_product_image(self, product_obj):
        img_uri = self.request.data.get("image_data_uri")
        if img_uri and str(img_uri).startswith("data:image/"):
            save_media_to_db(f"product_img_{product_obj.id}", img_uri)
        elif getattr(product_obj, "image", None):
            get_media_from_db(f"product_img_{product_obj.id}", product_obj.image)

    def perform_create(self, serializer):
        product_obj = serializer.save(is_available=True)
        self._save_product_actual_price(product_obj)
        self._persist_product_image(product_obj)

    def perform_update(self, serializer):
        product_obj = serializer.save()
        self._save_product_actual_price(product_obj)
        self._persist_product_image(product_obj)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsSiteAdmin()]


class SellProductSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SellProductSubmissionSerializer
    permission_classes = [IsFarmerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return SellProductSubmission.objects.all()
        return SellProductSubmission.objects.filter(seller=user)

    def _enrich_submission(self, sub_obj, item_dict):
        d = dict(item_dict)
        if sub_obj:
            s_img = get_media_from_db(f"submission_img_{sub_obj.id}", getattr(sub_obj, "image", None))
            if s_img:
                d["image"] = s_img
            else:
                d["image"] = normalize_url_or_data_uri(d.get("image"))
            seller = getattr(sub_obj, "seller", None)
            if seller:
                av = get_media_from_db(f"user_avatar_{seller.id}", getattr(seller, "profile_picture", None))
                if av:
                    d["seller_avatar"] = av
                else:
                    d["seller_avatar"] = normalize_url_or_data_uri(d.get("seller_avatar"))
        return d

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        by_id = {s.id: s for s in queryset}
        return Response([self._enrich_submission(by_id.get(i.get("id")), i) for i in serializer.data])

    def perform_create(self, serializer):
        sub_obj = serializer.save(seller=self.request.user)
        img_uri = self.request.data.get("image_data_uri")
        if img_uri and str(img_uri).startswith("data:image/"):
            save_media_to_db(f"submission_img_{sub_obj.id}", img_uri)
        elif getattr(sub_obj, "image", None):
            get_media_from_db(f"submission_img_{sub_obj.id}", sub_obj.image)

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def buy_from_farmer(self, request, pk=None):
        submission = self.get_object()

        if submission.status == "BOUGHT":
            return Response(
                {"error": "This harvest batch has already been purchased from the farmer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchased_qty = Decimal(str(request.data.get("quantity", submission.quantity))).quantize(
            Decimal("0.01")
        )
        agreed_rate = Decimal(
            str(request.data.get("agreed_wholesale_rate", submission.expected_price_per_unit))
        ).quantize(Decimal("0.01"))
        total_amount = (purchased_qty * agreed_rate).quantize(Decimal("0.01"))

        payment_method = request.data.get("payment_method", "CASH")
        payment_status = request.data.get("payment_status", "PAID")
        admin_notes = request.data.get("admin_notes", "").strip()
        publish_to_store = bool(request.data.get("publish_to_store", False))
        retail_price = request.data.get("retail_price")

        purchase = FarmerPurchase.objects.create(
            submission=submission,
            farmer=submission.seller,
            crop_name=submission.vegetable_name,
            category=submission.category,
            quantity=purchased_qty,
            unit=submission.unit,
            agreed_wholesale_rate=agreed_rate,
            total_amount=total_amount,
            payment_method=payment_method,
            payment_status=payment_status,
            pickup_location=submission.pickup_location,
            farmer_phone=submission.contact_phone,
            admin_notes=admin_notes,
        )

        submission.status = "BOUGHT"
        submission.admin_remarks = (
            f"Bought by KrishiMart: {purchased_qty} {submission.unit} @ "
            f"रु {agreed_rate}/{submission.unit} (Total: रु {total_amount}). {admin_notes}"
        )
        submission.save()

        if publish_to_store:
            cat_upper = (submission.category or "").upper()
            if "FRUIT" in cat_upper:
                mapped_cat = "FRUITS"
            elif "GRAIN" in cat_upper or "PULSE" in cat_upper:
                mapped_cat = "GRAINS"
            elif "SPICE" in cat_upper or "HERB" in cat_upper:
                mapped_cat = "SPICES"
            elif "DAIRY" in cat_upper or "HONEY" in cat_upper:
                mapped_cat = "DAIRY"
            else:
                mapped_cat = "VEGETABLES"

            final_retail_price = (
                Decimal(str(retail_price)).quantize(Decimal("0.01"))
                if retail_price
                else agreed_rate
            )

            created_prod = Product.objects.create(
                name=submission.vegetable_name,
                category=mapped_cat,
                description=f"{submission.vegetable_description} (Grown by: {submission.seller.full_name})",
                price=final_retail_price,
                unit=submission.unit
                if submission.unit in ["kg", "g", "bundle", "crate", "quintal"]
                else "kg",
                stock_quantity=purchased_qty,
                origin_location=submission.pickup_location,
                image=submission.image,
                is_available=True,
            )
            sub_duri = get_media_from_db(f"submission_img_{submission.id}", getattr(submission, "image", None))
            if sub_duri:
                save_media_to_db(f"product_img_{created_prod.id}", sub_duri)
            raw_actual_price = str(request.data.get("actual_price") or "").strip()
            if raw_actual_price:
                try:
                    act_val = Decimal(raw_actual_price).quantize(Decimal("0.01"))
                    if act_val > final_retail_price:
                        PRODUCT_ACTUAL_PRICES[created_prod.id] = act_val
                        _save_discount_cache()
                except Exception:
                    pass

        # Send automated procurement voucher email to the farmer
        send_farmer_procurement_email(purchase, is_settlement_update=False)

        return Response(
            {
                "message": f"Successfully purchased {purchased_qty} {submission.unit} from {submission.seller.full_name}!",
                "purchase": FarmerPurchaseSerializer(purchase).data,
                "submission": SellProductSubmissionSerializer(submission).data,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def review(self, request, pk=None):
        submission = self.get_object()
        new_status = request.data.get("status")
        admin_remarks = request.data.get("admin_remarks", "")

        if new_status not in ["PENDING", "APPROVED", "REJECTED", "BOUGHT"]:
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        submission.status = new_status
        submission.admin_remarks = admin_remarks
        submission.save()

        # Email the farmer when their harvest offer is Declined (REJECTED) or Approved
        if new_status in ["REJECTED", "APPROVED"]:
            send_farmer_offer_status_email(submission)

        return Response(SellProductSubmissionSerializer(submission).data)


class FarmerPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FarmerPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return FarmerPurchase.objects.all()
        return FarmerPurchase.objects.filter(farmer=user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        user = request.user
        if user.is_staff or user.role == "ADMIN":
            purchases = FarmerPurchase.objects.all()
        else:
            purchases = FarmerPurchase.objects.filter(farmer=user)

        total_amount = sum(p.total_amount for p in purchases)
        total_batches = purchases.count()
        return Response({
            "total_amount": total_amount,
            "total_batches": total_batches,
        })

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        purchase = self.get_object()
        purchase.payment_status = "PAID"
        purchase.save()
        # Notify the farmer by email that their pending payout has been settled
        send_farmer_procurement_email(purchase, is_settlement_update=True)
        return Response({"message": "Purchase marked as PAID"})

    @action(detail=True, methods=["post"])
    def remove(self, request, pk=None):
        purchase = self.get_object()
        purchase.delete()
        return Response({"message": "Purchase deleted"})


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminVerified]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return Order.objects.all()
        return Order.objects.filter(buyer=user)

    def _enrich_order_data(self, order_obj, data_dict):
        subtotal = get_order_original_subtotal(order_obj)
        disc_pct = ORDER_DISCOUNTS.get(order_obj.id, Decimal("0"))
        disc_amt = ((subtotal * disc_pct) / Decimal("100")).quantize(Decimal("0.01"))
        net_total = (subtotal - disc_amt).quantize(Decimal("0.01"))
        enriched = dict(data_dict)
        enriched["subtotal_price"] = str(subtotal)
        enriched["discount_percent"] = float(disc_pct)
        enriched["discount_amount"] = str(disc_amt)
        enriched["net_total"] = str(net_total)
        return enriched

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        orders_by_id = {o.id: o for o in queryset}
        enriched_list = [
            self._enrich_order_data(orders_by_id[item["id"]], item)
            if item.get("id") in orders_by_id
            else item
            for item in serializer.data
        ]
        return Response(enriched_list)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(self._enrich_order_data(instance, serializer.data))

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]
        total_price = product.price * quantity

        if product.stock_quantity >= quantity:
            product.stock_quantity -= quantity
        else:
            product.stock_quantity = Decimal("0.00")
        product.save()

        serializer.save(buyer=self.request.user, total_price=total_price)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated_order = serializer.save()

        # Always keep order.total_price equal to the true original subtotal (product.price * quantity)
        # so opening the receipt later never shows a discounted price as the main subtotal!
        true_subtotal = get_order_original_subtotal(updated_order)
        if updated_order.total_price != true_subtotal:
            updated_order.total_price = true_subtotal
            updated_order.save(update_fields=["total_price"])

        if old_status != "CANCELLED" and updated_order.status == "CANCELLED":
            product = updated_order.product
            if product:
                product.stock_quantity += updated_order.quantity
                product.save()

        # For DELIVERED and CANCELLED, send the email immediately on status change.
        # For CONFIRMED, NEVER send email on dropdown change — wait until Admin clicks
        # "Apply Discount & Email Receipt" inside the 1/4 A4 Receipt Modal!
        if old_status != updated_order.status and updated_order.status in ["DELIVERED", "CANCELLED"]:
            send_order_status_email(updated_order)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def apply_discount_and_email(self, request, pk=None):
        """
        Records the Admin's chosen Discount (%) from the 1/4 A4 Receipt Modal
        (WITHOUT overwriting order.total_price in the DB so the main subtotal is always consistent)
        and sends the Confirmed Order email ONE TIME ONLY.
        """
        if not (request.user.is_staff or getattr(request.user, "role", "") == "ADMIN"):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()
        raw_disc = request.data.get("discount_percent", 0)
        try:
            disc_pct = max(Decimal("0"), min(Decimal("100"), Decimal(str(raw_disc or 0))))
        except Exception:
            disc_pct = Decimal("0")

        ORDER_DISCOUNTS[order.id] = disc_pct
        _save_discount_cache()

        # Ensure order.total_price in DB stays as the true original subtotal (e.g. Rs. 900.00)
        subtotal = get_order_original_subtotal(order)
        if order.total_price != subtotal:
            order.total_price = subtotal
            order.save(update_fields=["total_price"])

        disc_amt = ((subtotal * disc_pct) / Decimal("100")).quantize(Decimal("0.01"))
        net_total = (subtotal - disc_amt).quantize(Decimal("0.01"))

        # Send the CONFIRMED email ONLY ONCE per order confirmation
        already_sent = order.id in CONFIRMED_EMAIL_SENT_ORDERS
        if not already_sent:
            send_order_status_email(order, discount_percent=disc_pct)
            CONFIRMED_EMAIL_SENT_ORDERS.add(order.id)
            _save_discount_cache()

        buyer_email = getattr(order.buyer, "email", None) or "customer"
        disc_str = str(int(disc_pct)) if disc_pct == int(disc_pct) else str(disc_pct)

        return Response(
            {
                "message": (
                    f"Discount ({disc_str}%) saved! Confirmation email was already sent to {buyer_email}."
                    if already_sent
                    else f"Confirmed receipt emailed to {buyer_email} (Discount: {disc_str}%, Total Payable: रु {net_total})!"
                ),
                "already_sent": True,
                "order": OrderSerializer(order).data,
                "subtotal": str(subtotal),
                "discount_percent": float(disc_pct),
                "discount_amount": str(disc_amt),
                "net_total": str(net_total),
            }
        )


class StoryReviewViewSet(viewsets.ModelViewSet):
    serializer_class = StoryReviewSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.role == "ADMIN"):
            return StoryReview.objects.all()
        return StoryReview.objects.filter(status="APPROVED")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAdminVerified()]

    def _enrich_review(self, item_dict, story_obj=None):
        enriched = dict(item_dict)
        rid = enriched.get("id")
        meta = REVIEW_PRODUCT_MAP.get(rid) or {}
        enriched["product_id"] = meta.get("product_id")
        enriched["product_name"] = meta.get("product_name")
        enriched["order_id"] = meta.get("order_id")
        if story_obj:
            st_img = get_media_from_db(f"story_img_{story_obj.id}", getattr(story_obj, "image", None))
            if st_img:
                enriched["image"] = st_img
            else:
                enriched["image"] = normalize_url_or_data_uri(enriched.get("image"))
            author = getattr(story_obj, "author", None)
            if author:
                av = get_media_from_db(f"user_avatar_{author.id}", getattr(author, "profile_picture", None))
                if av:
                    enriched["author_avatar"] = av
                else:
                    enriched["author_avatar"] = normalize_url_or_data_uri(enriched.get("author_avatar"))
        return enriched

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        by_id = {s.id: s for s in queryset}
        return Response([self._enrich_review(item, by_id.get(item.get("id"))) for item in serializer.data])

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(self._enrich_review(serializer.data))

    def perform_create(self, serializer):
        user = self.request.user
        stype = serializer.validated_data.get("story_type")
        if not stype:
            stype = "FARMER_STORY" if user.role == "FARMER" else "BUYER_REVIEW"

        raw_prod_id = self.request.data.get("product_id")
        raw_prod_name = (self.request.data.get("product_name") or "").strip()
        raw_order_id = self.request.data.get("order_id")

        # If this is a Verified Delivered-Order Product Review, auto-approve so the product's
        # review count and rating update immediately (Admin can still moderate/reject anytime).
        is_verified_product_review = bool(stype == "BUYER_REVIEW" and (raw_prod_id or raw_prod_name))
        initial_status = "APPROVED" if is_verified_product_review else "PENDING"

        story_obj = serializer.save(author=user, story_type=stype, status=initial_status)
        img_uri = self.request.data.get("image_data_uri")
        if img_uri and str(img_uri).startswith("data:image/"):
            save_media_to_db(f"story_img_{story_obj.id}", img_uri)
        elif getattr(story_obj, "image", None):
            get_media_from_db(f"story_img_{story_obj.id}", story_obj.image)

        if raw_prod_id or raw_prod_name:
            REVIEW_PRODUCT_MAP[story_obj.id] = {
                "product_id": int(raw_prod_id) if str(raw_prod_id).isdigit() else None,
                "product_name": raw_prod_name,
                "order_id": int(raw_order_id) if str(raw_order_id).isdigit() else None,
            }
            _save_discount_cache()

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def toggle_status(self, request, pk=None):
        story = self.get_object()
        new_status = request.data.get("status")
        if new_status not in ["APPROVED", "REJECTED", "PENDING"]:
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        story.status = new_status
        story.save()
        return Response(self._enrich_review(StoryReviewSerializer(story).data))