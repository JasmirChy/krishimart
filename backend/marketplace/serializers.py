from rest_framework import serializers
from .models import Product, SellProductSubmission, FarmerPurchase, Order


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class SellProductSubmissionSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.full_name", read_only=True)
    seller_email = serializers.CharField(source="seller.email", read_only=True)
    seller_role = serializers.CharField(source="seller.role", read_only=True)
    seller_avatar = serializers.ImageField(source="seller.profile_picture", read_only=True)

    class Meta:
        model = SellProductSubmission
        fields = [
            "id",
            "seller",
            "seller_name",
            "seller_email",
            "seller_role",
            "seller_avatar",
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


class FarmerPurchaseSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source="farmer.full_name", read_only=True)
    farmer_avatar = serializers.ImageField(source="farmer.profile_picture", read_only=True)

    class Meta:
        model = FarmerPurchase
        fields = [
            "id",
            "submission",
            "farmer",
            "farmer_name",
            "farmer_avatar",
            "crop_name",
            "category",
            "quantity",
            "unit",
            "agreed_wholesale_rate",
            "total_amount",
            "payment_method",
            "payment_status",
            "pickup_location",
            "farmer_phone",
            "admin_notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


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