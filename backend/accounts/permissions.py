from rest_framework.permissions import BasePermission


class IsAdminVerified(BasePermission):
    """
    Allows access only to users verified by Admin (or staff/admins).
    """
    message = "Your account is pending Admin verification. Full access will be granted once approved."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin_verified or request.user.is_staff or request.user.role == "ADMIN")
        )


class IsFarmerOrAdmin(BasePermission):
    """
    Strict permission: Only verified Farmers or Admins can submit products to sell.
    Customers are blocked from selling.
    """
    message = "Only verified Farmers can sell produce to KrishiMart. Customer accounts can only buy products."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if not (user.is_admin_verified or user.is_staff or user.role == "ADMIN"):
            return False
        return bool(user.role in ["FARMER", "ADMIN"] or user.is_staff)


class IsSiteAdmin(BasePermission):
    """
    Allows access only to Admin users.
    """
    message = "Only Admin users can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.role == "ADMIN")
        )