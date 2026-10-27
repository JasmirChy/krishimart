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
    'Sell Your Products' feature: Farmers or Customers submit their vegetables/produce
    to sell directly to the business owner / Admin.
    """
    STATUS_CHOICES = (
        ("PENDING", "Pending Review"),
        ("APPROVED", "Approved & Purchased"),
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
        help_text="Describe freshness, harvest date, organic status, and quality."
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="kg")
    expected_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    contact_phone = models.CharField(max_length=20)
    pickup_location = models.CharField(
        max_length=255,
        help_text="Full farm or pickup address/location",
    )
    image = models.ImageField(upload_to="farmer_submissions/", null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    admin_remarks = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.vegetable_name} ({self.quantity} {self.unit}) by {self.seller.full_name}"


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