from rest_framework import serializers
from .models import Product, SellProductSubmission, Order


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class SellProductSubmissionSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.full_name", read_only=True)
    seller_email = serializers.CharField(source="seller.email", read_only=True)
    seller_role = serializers.CharField(source="seller.role", read_only=True)

    class Meta:
        model = SellProductSubmission
        fields = [
            "id",
            "seller",
            "seller_name",
            "seller_email",
            "seller_role",
            "vegetable_name",
            "category",
            "vegetable_description",
            "quantity",
            "unit",
            "expected_price_per_unit",
            "contact_phone",
            "pickup_location",
            "image",
            "status",
            "admin_remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "seller", "created_at", "updated_at"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_expected_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expected price must be greater than zero.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.full_name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_unit = serializers.CharField(source="product.unit", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "buyer",
            "buyer_name",
            "product",
            "product_name",
            "product_unit",
            "quantity",
            "total_price",
            "delivery_address",
            "contact_phone",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "buyer", "total_price", "created_at"]