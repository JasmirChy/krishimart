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


class ProductViewSet(viewsets.ModelViewSet):
    """
    Verified users can browse products; only Admin can add, update, or delete store products.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAdminVerified()]
        return [IsSiteAdmin()]


class SellProductSubmissionViewSet(viewsets.ModelViewSet):
    """
    'Sell Your Products' endpoint:
    - Verified Farmers/Customers can submit their vegetables & view their own submissions.
    - Admin can view all farmer submissions, approve/reject them, or add remarks.
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

        # Optionally publish to store automatically if Admin approves and requests it
        if new_status == "APPROVED" and request.data.get("publish_to_store"):
            Product.objects.create(
                name=submission.vegetable_name,
                description=submission.vegetable_description,
                price=submission.expected_price_per_unit,
                unit=submission.unit,
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
        serializer.save(buyer=self.request.user, total_price=total_price)