from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, CurrentUserView, AdminUserViewSet

router = DefaultRouter()
router.register(r"admin/users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("", include(router.urls)),
]