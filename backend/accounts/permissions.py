from rest_framework.permissions import BasePermission


class IsAdminVerified(BasePermission):
    """
    Allows access only to users who have been verified by the Admin.
    """
    message = "Your account is pending Admin verification. You will gain full access once approved."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin_verified or request.user.is_staff)
        )


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