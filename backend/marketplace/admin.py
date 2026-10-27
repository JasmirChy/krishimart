from django.contrib import admin
from .models import Product, SellProductSubmission, Order


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "unit", "stock_quantity", "origin_location", "is_available")
    list_filter = ("category", "is_available")
    search_fields = ("name", "description", "origin_location")


@admin.register(SellProductSubmission)
class SellProductSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "vegetable_name",
        "seller",
        "quantity",
        "unit",
        "expected_price_per_unit",
        "contact_phone",
        "pickup_location",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("vegetable_name", "vegetable_description", "contact_phone", "pickup_location")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "buyer", "product", "quantity", "total_price", "status", "created_at")
    list_filter = ("status", "created_at")