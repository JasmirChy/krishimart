from django.db.models import Count, Max
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

        # When Admin requests a specific user's thread in Admin Panel
        if user_id and (user.is_staff or user.role == "ADMIN"):
            return ChatMessage.objects.filter(conversation_user_id=user_id).order_by("created_at")

        # Default: return the logged-in user's own conversation thread
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
        )
        return Response(
            ChatMessageSerializer(chat_msg).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], permission_classes=[IsSiteAdmin])
    def threads(self, request):
        """
        Returns all users (prioritizing users who have sent chat messages) for the Admin Chat sidebar.
        """
        users = (
            User.objects.annotate(
                msg_count=Count("conversation_messages"),
                last_msg=Max("conversation_messages__created_at"),
            )
            .order_by("-last_msg", "-created_at")
        )
        return Response(UserSerializer(users, many=True).data)