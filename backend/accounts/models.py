from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError


phone_validator = RegexValidator(
    regex=r"^\+?[0-9]{10,15}$",
    message="Enter a valid phone number (10 to 15 digits, optional leading +).",
)


class UserManager(BaseUserManager):
    def create_user(self, email=None, phone_number=None, password=None, **extra_fields):
        if not email and not phone_number:
            raise ValueError("Users must provide either an email address or a phone number.")

        if email:
            email = self.normalize_email(email).lower()

        user = self.model(
            email=email,
            phone_number=phone_number,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email=None, phone_number=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_admin_verified", True)
        extra_fields.setdefault("role", "ADMIN")

        return self.create_user(
            email=email,
            phone_number=phone_number,
            password=password,
            **extra_fields,
        )


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("CUSTOMER", "Customer / Buyer"),
        ("FARMER", "Farmer / Seller"),
        ("ADMIN", "Admin"),
    )

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(
        max_length=15,
        unique=True,
        null=True,
        blank=True,
        validators=[phone_validator],
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="CUSTOMER")
    location = models.CharField(max_length=255, blank=True, default="")
    profile_picture = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # Admin verification gate: False for new users until Admin approves them
    is_admin_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "phone_number"]

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        if not self.email and not self.phone_number:
            raise ValidationError("Either an email address or a phone number is required.")

    def __str__(self):
        identifier = self.email or self.phone_number
        return f"{self.full_name} ({identifier}) [{self.role}]"