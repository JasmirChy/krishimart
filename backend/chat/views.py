from django.db.models import Count, Max, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.models import User
from accounts.permissions import IsAdminVerified, IsSiteAdmin
from accounts.serializers import UserSerializer
from .models import ChatMessage
from .serializers import ChatMessageSerializer


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAdminVerified]

    def get_queryset(self):
        user = self.request.user
        user_id = self.request.query_params.get("user_id")

        if user.is_staff or user.role == "ADMIN":
            # Allow Admin to delete or inspect any message across all user threads
            if self.action in ["destroy", "retrieve", "update", "partial_update"]:
                return ChatMessage.objects.all()

            if user_id:
                ChatMessage.objects.filter(
                    conversation_user_id=user_id,
                    is_admin_reply=False,
                    is_read=False,
                ).update(is_read=True)
                return ChatMessage.objects.filter(conversation_user_id=user_id).order_by(
                    "created_at"
                )

        # When a Customer/Farmer opens their chat, mark Admin replies as read
        ChatMessage.objects.filter(
            conversation_user=user,
            is_admin_reply=True,
            is_read=False,
        ).update(is_read=True)
        return ChatMessage.objects.filter(conversation_user=user).order_by("created_at")

    def create(self, request, *args, **kwargs):
        user = request.user
        message_text = request.data.get("message", "").strip()
        if not message_text:
            return Response(
                {"error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user_id = request.data.get("conversation_user")
        is_admin_sending = bool(
            request.data.get("is_admin_reply")
            or (target_user_id and (user.is_staff or user.role == "ADMIN"))
        )

        if is_admin_sending and target_user_id:
            try:
                conversation_user = User.objects.get(pk=target_user_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "Target user not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            conversation_user = user
            is_admin_sending = False

        chat_msg = ChatMessage.objects.create(
            conversation_user=conversation_user,
            sender=user,
            message=message_text,
            is_admin_reply=is_admin_sending,
            is_read=False,
        )
        return Response(
            ChatMessageSerializer(chat_msg).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        user = request.user
        # Admin can delete ANY message (both sent and received);
        # Regular users can only delete their own sent messages
        if not (user.is_staff or user.role == "ADMIN") and (
            msg.sender_id != user.id or msg.is_admin_reply
        ):
            return Response(
                {"error": "You can only delete your own sent messages."},
                status=status.HTTP_403_FORBIDDEN,
            )
        msg.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["delete"], permission_classes=[IsSiteAdmin])
    def clear_thread(self, request):
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"error": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted_count, _ = ChatMessage.objects.filter(conversation_user_id=user_id).delete()
        return Response({"message": f"Cleared {deleted_count} messages from conversation."})

    @action(detail=False, methods=["get"], permission_classes=[IsSiteAdmin])
    def threads(self, request):
        users = (
            User.objects.annotate(
                total_messages=Count("conversation_messages"),
                unread_count=Count(
                    "conversation_messages",
                    filter=Q(
                        conversation_messages__is_admin_reply=False,
                        conversation_messages__is_read=False,
                    ),
                ),
                last_msg=Max("conversation_messages__created_at"),
            )
            .order_by("-unread_count", "-last_msg", "-created_at")
        )
        data = []
        for u in users:
            serialized = UserSerializer(u).data
            serialized["unread_count"] = u.unread_count
            serialized["total_messages"] = u.total_messages
            data.append(serialized)
        return Response(data)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        user = request.user
        if user.is_staff or user.role == "ADMIN":
            count = ChatMessage.objects.filter(is_admin_reply=False, is_read=False).count()
        else:
            count = ChatMessage.objects.filter(
                conversation_user=user, is_admin_reply=True, is_read=False
            ).count()
        return Response({"unread_count": count})