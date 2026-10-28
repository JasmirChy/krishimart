from django.db import models
from django.conf import settings


class Product(models.Model):
    CATEGORY_CHOICES = (
        ("VEGETABLES", "Fresh Vegetables"),
        ("FRUITS", "Fresh Fruits"),
        ("GRAINS", "Grains & Pulses"),
        ("SPICES", "Herbs & Spices"),
        ("DAIRY", "Organic & Dairy"),
    )

    UNIT_CHOICES = (
        ("kg", "Kilogram (kg)"),
        ("g", "Gram (g)"),
        ("bundle", "Bundle"),
        ("crate", "Crate"),
        ("quintal", "Quintal"),
    )

    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="VEGETABLES")
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default="kg")
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    origin_location = models.CharField(max_length=150, blank=True, default="")
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} (Rs. {self.price}/{self.unit})"


class SellProductSubmission(models.Model):
    """
    Farmer submission portal for wholesale harvest offers.
    """
    STATUS_CHOICES = (
        ("PENDING", "Pending Review"),
        ("BOUGHT", "Purchased by Admin"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Declined"),
    )

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_submissions",
    )
    vegetable_name = models.CharField(max_length=150)
    category = models.CharField(max_length=50, default="Fresh Vegetables")
    vegetable_description = models.TextField(
        help_text="Freshness, harvest date, and quality notes."
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="kg")
    expected_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    contact_phone = models.CharField(max_length=20)
    pickup_location = models.CharField(max_length=255)
    image = models.ImageField(upload_to="farmer_submissions/", null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    admin_remarks = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.vegetable_name} ({self.quantity} {self.unit}) by {self.seller.full_name}"


class FarmerPurchase(models.Model):
    """
    Tracks official procurement transactions when Admin buys crops from Farmers.
    """
    PAYMENT_STATUS_CHOICES = (
        ("PAID", "Payment Settled"),
        ("PENDING", "Pending on Pickup"),
    )

    PAYMENT_METHOD_CHOICES = (
        ("CASH", "Cash on Pickup"),
        ("BANK", "Direct Bank Transfer"),
        ("ESEWA", "eSewa / Digital Wallet"),
    )

    submission = models.ForeignKey(
        SellProductSubmission,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchases",
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sales_to_admin",
    )
    crop_name = models.CharField(max_length=150)
    category = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="kg")
    agreed_wholesale_rate = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="CASH")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="PAID")
    pickup_location = models.CharField(max_length=255)
    farmer_phone = models.CharField(max_length=20)
    admin_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Bought {self.quantity} {self.unit} of {self.crop_name} from {self.farmer.full_name} (Rs. {self.total_amount})"


class Order(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("CONFIRMED", "Confirmed"),
        ("DELIVERED", "Delivered"),
        ("CANCELLED", "Cancelled"),
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_address = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.id} - {self.product.name} by {self.buyer.full_name}"