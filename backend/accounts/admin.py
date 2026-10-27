from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "full_name",
        "email",
        "phone_number",
        "role",
        "is_admin_verified",
        "is_active",
        "created_at",
    )
    list_filter = ("is_admin_verified", "role", "is_active")
    search_fields = ("full_name", "email", "phone_number", "location")
    ordering = ("-created_at",)

    fieldsets = (
        ("Credentials", {"fields": ("email", "phone_number", "password")}),
        ("Personal Info", {"fields": ("full_name", "role", "location")}),
        (
            "Verification & Permissions",
            {
                "fields": (
                    "is_admin_verified",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "full_name",
                    "email",
                    "phone_number",
                    "role",
                    "location",
                    "password1",
                    "password2",
                    "is_admin_verified",
                ),
            },
        ),
    )

    actions = ["approve_users"]

    @admin.action(description="Verify selected users (Grant full site access)")
    def approve_users(self, request, queryset):
        updated = queryset.update(is_admin_verified=True)
        self.message_user(request, f"{updated} user(s) have been verified and granted access.")