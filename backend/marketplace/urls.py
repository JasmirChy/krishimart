from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    SellProductSubmissionViewSet,
    FarmerPurchaseViewSet,
    OrderViewSet,
    StoryReviewViewSet,
)

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="products")
router.register(r"sell-submissions", SellProductSubmissionViewSet, basename="sell-submissions")
router.register(r"farmer-purchases", FarmerPurchaseViewSet, basename="farmer-purchases")
router.register(r"orders", OrderViewSet, basename="orders")
router.register(r"stories", StoryReviewViewSet, basename="stories")

urlpatterns = [
    path("", include(router.urls)),
]