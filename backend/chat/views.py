import json
import os
from django.db.models import Count, Max, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.models import User
from accounts.permissions import IsAdminVerified, IsSiteAdmin
from accounts.serializers import UserSerializer
from .models import ChatMessage
from .serializers import ChatMessageSerializer

CHAT_DELETIONS_CACHE_FILE = os.path.join(os.path.dirname(__file__), "chat_deletions_cache.json")
UNSENT_MARKER = "🚫 This message was unsent"


def _load_chat_deletions():
    try:
        if os.path.exists(CHAT_DELETIONS_CACHE_FILE):
            with open(CHAT_DELETIONS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                hidden = {
                    int(k): set(str(u) for u in v)
                    for k, v in data.get("hidden_for", {}).items()
                }
                unsent = set(int(x) for x in data.get("unsent_ids", []))
                return hidden, unsent
    except Exception:
        pass
    return {}, set()


def _save_chat_deletions():
    try:
        data = {
            "hidden_for": {str(k): list(v) for k, v in HIDDEN_FOR_USERS.items()},
            "unsent_ids": list(UNSENT_MESSAGE_IDS),
        }
        with open(CHAT_DELETIONS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


HIDDEN_FOR_USERS, UNSENT_MESSAGE_IDS = _load_chat_deletions()


def _viewer_key(user):
    if user.is_staff or getattr(user, "role", "") == "ADMIN":
        return "ADMIN"
    return str(user.id)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAdminVerified]

    def get_queryset(self):
        user = self.request.user
        user_id = self.request.query_params.get("user_id")

        if user.is_staff or user.role == "ADMIN":
            if self.action in [
                "destroy",
                "retrieve",
                "update",
                "partial_update",
            ]:
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

    def _enrich_and_filter_messages(self, queryset, viewer_user):
        viewer = _viewer_key(viewer_user)
        is_viewer_admin = viewer == "ADMIN"
        msg_objs_by_id = {m.id: m for m in queryset}
        serialized = self.get_serializer(queryset, many=True).data
        result = []
        for item in serialized:
            mid = item.get("id")
            hidden_set = HIDDEN_FOR_USERS.get(mid, set())
            if viewer in hidden_set or str(viewer_user.id) in hidden_set:
                continue

            msg_obj = msg_objs_by_id.get(mid)
            from_admin = bool(
                getattr(msg_obj, "is_admin_reply", False)
                if msg_obj is not None
                else (item.get("is_from_admin") or item.get("is_admin_reply"))
            )

            enriched = dict(item)
            enriched["is_from_admin"] = from_admin
            enriched["is_admin_reply"] = from_admin

            is_unsent = (
                mid in UNSENT_MESSAGE_IDS
                or enriched.get("message") == UNSENT_MARKER
            )
            enriched["is_unsent"] = is_unsent
            if is_unsent:
                enriched["message"] = UNSENT_MARKER

            # STRICT RULE: Only the person who SENT the message can "Unsend for Everyone"
            # - Admin can ONLY unsend messages where from_admin is True
            # - Customer/Farmer can ONLY unsend messages where from_admin is False
            enriched["can_unsend_everyone"] = (
                (from_admin and not is_unsent)
                if is_viewer_admin
                else ((not from_admin) and not is_unsent)
            )
            result.append(enriched)
        return result

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        return Response(self._enrich_and_filter_messages(queryset, request.user))

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
        data = ChatMessageSerializer(chat_msg).data
        data["is_from_admin"] = is_admin_sending
        data["is_admin_reply"] = is_admin_sending
        data["is_unsent"] = False
        data["can_unsend_everyone"] = True
        return Response(data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Supports Facebook Messenger / WhatsApp style deletion via ?mode=me or ?mode=everyone:
        - mode=me: Hides the message ONLY for the requesting user (works on any sent or received message).
        - mode=everyone: Unsends the message for EVERYONE — strictly allowed ONLY for the sender who sent it!
          (Admin can only unsend Admin's own sent messages; User can only unsend User's own sent messages).
        """
        msg = self.get_object()
        user = request.user
        mode = (request.query_params.get("mode") or request.data.get("mode") or "me").lower()
        viewer = _viewer_key(user)
        is_admin = viewer == "ADMIN"

        # 1. DELETE FOR ME (Any user or Admin can remove any message from their own view)
        if mode == "me":
            if msg.id not in HIDDEN_FOR_USERS:
                HIDDEN_FOR_USERS[msg.id] = set()
            HIDDEN_FOR_USERS[msg.id].add(viewer)
            HIDDEN_FOR_USERS[msg.id].add(str(user.id))
            _save_chat_deletions()
            return Response(
                {"message": "Message removed for you.", "mode": "me", "id": msg.id},
                status=status.HTTP_200_OK,
            )

        # 2. UNSEND FOR EVERYONE (Strictly only the sender of that message can unsend it for everyone!)
        if is_admin:
            can_unsend = bool(msg.is_admin_reply)
        else:
            can_unsend = bool((not msg.is_admin_reply) and msg.conversation_user_id == user.id)

        if not can_unsend:
            return Response(
                {"error": "You can only unsend messages that you sent yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )

        UNSENT_MESSAGE_IDS.add(msg.id)
        msg.message = UNSENT_MARKER
        msg.save(update_fields=["message"])
        _save_chat_deletions()
        return Response(
            {
                "message": "Message unsent for everyone.",
                "mode": "everyone",
                "id": msg.id,
                "is_unsent": True,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["delete"], permission_classes=[IsAdminVerified])
    def clear_thread(self, request):
        """
        Clears a conversation for the current viewer (mode=me) or for everyone (Admin only).
        """
        user = request.user
        is_admin = bool(user.is_staff or user.role == "ADMIN")
        mode = (request.query_params.get("mode") or "me").lower()
        target_user_id = request.query_params.get("user_id") if is_admin else user.id

        if not target_user_id:
            return Response(
                {"error": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        thread_msgs = ChatMessage.objects.filter(conversation_user_id=target_user_id)

        if mode == "me" or not is_admin:
            viewer = _viewer_key(user)
            count = 0
            for m in thread_msgs:
                if m.id not in HIDDEN_FOR_USERS:
                    HIDDEN_FOR_USERS[m.id] = set()
                HIDDEN_FOR_USERS[m.id].add(viewer)
                HIDDEN_FOR_USERS[m.id].add(str(user.id))
                count += 1
            _save_chat_deletions()
            return Response({"message": f"Cleared {count} messages from your view."})

        deleted_count, _ = thread_msgs.delete()
        return Response({"message": f"Cleared {deleted_count} messages for everyone."})

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
            visible_msgs = [
                m
                for m in ChatMessage.objects.filter(conversation_user=u).order_by("-created_at")
                if "ADMIN" not in HIDDEN_FOR_USERS.get(m.id, set())
            ]
            serialized["unread_count"] = u.unread_count
            serialized["total_messages"] = len(visible_msgs)
            if visible_msgs:
                latest = visible_msgs[0]
                prefix = "You: " if latest.is_admin_reply else ""
                msg_txt = (
                    UNSENT_MARKER
                    if latest.id in UNSENT_MESSAGE_IDS
                    else latest.message
                )
                serialized["last_message_preview"] = f"{prefix}{msg_txt}"
                serialized["last_message_time"] = latest.created_at
            else:
                serialized["last_message_preview"] = ""
                serialized["last_message_time"] = None
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