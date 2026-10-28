from decimal import Decimal
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
        return Product.objects.filter(is_available=True)

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

            Product.objects.create(
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

        if old_status != "CANCELLED" and updated_order.status == "CANCELLED":
            product = updated_order.product
            product.stock_quantity += updated_order.quantity
            product.save()


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

    def perform_create(self, serializer):
        user = self.request.user
        stype = serializer.validated_data.get("story_type")
        if not stype:
            stype = "FARMER_STORY" if user.role == "FARMER" else "BUYER_REVIEW"
        serializer.save(author=user, story_type=stype, status="PENDING")

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def toggle_status(self, request, pk=None):
        story = self.get_object()
        new_status = request.data.get("status")
        if new_status not in ["APPROVED", "REJECTED", "PENDING"]:
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        story.status = new_status
        story.save()
        return Response(StoryReviewSerializer(story).data)