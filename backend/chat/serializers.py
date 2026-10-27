from rest_framework import serializers
from .models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    is_from_admin = serializers.SerializerMethodField()
    conversation_user_name = serializers.CharField(
        source="conversation_user.full_name", read_only=True
    )

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "conversation_user",
            "conversation_user_name",
            "sender",
            "sender_name",
            "sender_role",
            "is_from_admin",
            "is_admin_reply",
            "message",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "sender", "created_at"]

    def get_is_from_admin(self, obj):
        # True only when the message was sent as an Admin reply (or by a different Admin user)
        return bool(obj.is_admin_reply or obj.sender_id != obj.conversation_user_id)