from django.db import models
from django.conf import settings


class ChatMessage(models.Model):
    """
    Direct messaging thread between any verified User (Buyer/Seller) and the Admin team.
    `conversation_user` identifies which Customer/Farmer thread the message belongs to.
    `is_admin_reply` is True when sent from the Admin Panel Inbox, and False when sent by the User.
    """
    conversation_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    message = models.TextField()
    is_admin_reply = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        role_label = "Admin" if self.is_admin_reply else self.conversation_user.full_name
        return f"From {role_label} in thread ({self.conversation_user.full_name})"