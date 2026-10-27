from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone_number",
            "role",
            "location",
            "is_admin_verified",
            "is_active",
            "is_staff",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
            "phone_number",
            "role",
            "location",
            "password",
            "confirm_password",
        ]

    def validate(self, attrs):
        email = attrs.get("email")
        phone_number = attrs.get("phone_number")

        if email:
            email = email.strip().lower()
            attrs["email"] = email
        else:
            attrs["email"] = None

        if phone_number:
            phone_number = phone_number.strip()
            attrs["phone_number"] = phone_number
        else:
            attrs["phone_number"] = None

        if not attrs["email"] and not attrs["phone_number"]:
            raise serializers.ValidationError(
                "Please provide at least an email address or a phone number."
            )

        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        if attrs.get("role") == "ADMIN":
            raise serializers.ValidationError({"role": "Cannot self-register as Admin."})

        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            is_admin_verified=False,  # Must be verified by Admin before accessing features
            **validated_data,
        )
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        help_text="Enter your registered Email or Phone Number"
    )
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get("identifier", "").strip()
        password = attrs.get("password", "")

        user = authenticate(
            request=self.context.get("request"),
            username=identifier,
            password=password,
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid email/phone number or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account has been deactivated by the Admin."
            )

        refresh = RefreshToken.for_user(user)
        return {
            "user": UserSerializer(user).data,
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
        }