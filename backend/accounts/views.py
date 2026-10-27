from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsSiteAdmin
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Registration successful! Your account is now pending Admin verification.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint to list, add, verify/unverify, update, or delete any user.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSiteAdmin]

    @action(detail=True, methods=["post"])
    def toggle_verification(self, request, pk=None):
        user = self.get_object()
        user.is_admin_verified = not user.is_admin_verified
        user.save()
        status_label = "verified" if user.is_admin_verified else "unverified"
        return Response(
            {
                "message": f"User {user.full_name} is now {status_label}.",
                "user": UserSerializer(user).data,
            }
        )