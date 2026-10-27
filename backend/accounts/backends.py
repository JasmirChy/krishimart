from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from .models import User


class EmailOrPhoneBackend(ModelBackend):
    """
    Authenticate a user using either their email address or phone number.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("identifier") or kwargs.get("email")
        if not identifier or not password:
            return None

        identifier = identifier.strip()
        try:
            user = User.objects.get(
                Q(email__iexact=identifier) | Q(phone_number=identifier)
            )
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None