from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsAdminVerified, IsSiteAdmin
from .models import Product, SellProductSubmission, Order
from .serializers import (
    ProductSerializer,
    SellProductSubmissionSerializer,
    OrderSerializer,
)

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
    """
    Verified users can browse products; only Admin can add, update, or delete store products.
    Automatically seeds initial Nepali products into PostgreSQL if the table is empty.
    """
    serializer_class = ProductSerializer

    def get_queryset(self):
        if not Product.objects.exists():
            for item in INITIAL_NEPAL_PRODUCTS:
                Product.objects.create(**item)
        return Product.objects.all()

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAdminVerified()]
        return [IsSiteAdmin()]


class SellProductSubmissionViewSet(viewsets.ModelViewSet):
    """
    'Sell Your Products' endpoint:
    - Verified Farmers/Customers can submit their vegetables & view their own submissions.
    - Admin can view all farmer submissions, approve/reject them, and publish to the store.
    """
    serializer_class = SellProductSubmissionSerializer
    permission_classes = [IsAdminVerified]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return SellProductSubmission.objects.all()
        return SellProductSubmission.objects.filter(seller=user)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def review(self, request, pk=None):
        submission = self.get_object()
        new_status = request.data.get("status")
        admin_remarks = request.data.get("admin_remarks", "")

        if new_status not in ["PENDING", "APPROVED", "REJECTED"]:
            return Response(
                {"error": "Invalid status. Choose PENDING, APPROVED, or REJECTED."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission.status = new_status
        submission.admin_remarks = admin_remarks
        submission.save()

        if new_status == "APPROVED" and request.data.get("publish_to_store"):
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

            Product.objects.create(
                name=submission.vegetable_name,
                category=mapped_cat,
                description=submission.vegetable_description,
                price=submission.expected_price_per_unit,
                unit=submission.unit if submission.unit in ["kg", "g", "bundle", "crate", "quintal"] else "kg",
                stock_quantity=submission.quantity,
                origin_location=submission.pickup_location,
                image=submission.image,
            )

        return Response(SellProductSubmissionSerializer(submission).data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminVerified]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == "ADMIN":
            return Order.objects.all()
        return Order.objects.filter(buyer=user)

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]
        total_price = product.price * quantity

        # Deduct stock quantity in PostgreSQL
        if product.stock_quantity >= quantity:
            product.stock_quantity -= quantity
        else:
            product.stock_quantity = Decimal("0.00")
        product.save()

        serializer.save(buyer=self.request.user, total_price=total_price)