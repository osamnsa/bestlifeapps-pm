from django.contrib.auth import get_user_model
from rest_framework import serializers
from core.serializers import UserSerializer, LabelSerializer
from core.models import Label
from .models import WorkflowState, WorkItem, Attachment, Comment, ActivityLog, SavedView

User = get_user_model()


class WorkflowStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowState
        fields = ["id", "project", "name", "group", "color", "order"]


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = Attachment
        fields = ["id", "work_item", "file", "file_name", "file_size", "uploaded_by", "created_at"]
        read_only_fields = ["file_name", "file_size", "uploaded_by"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "work_item", "author", "body", "body_html", "created_at", "updated_at"]


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ["id", "work_item", "actor", "verb", "field", "old_value", "new_value", "created_at"]


class WorkItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for board/list views."""
    assignees = UserSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    identifier = serializers.CharField(read_only=True)
    state_group = serializers.CharField(source="state.group", read_only=True)

    class Meta:
        model = WorkItem
        fields = [
            "id", "identifier", "project", "number", "title", "item_type", "state", "state_group",
            "priority", "cycle", "parent", "assignees", "labels", "story_points", "due_date",
            "completed_at", "created_at", "updated_at",
        ]


class WorkItemDetailSerializer(serializers.ModelSerializer):
    assignees = UserSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        source="assignees", queryset=User.objects.all(), many=True, write_only=True, required=False
    )
    labels = LabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        source="labels", queryset=Label.objects.all(), many=True, write_only=True, required=False
    )
    attachments = AttachmentSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    identifier = serializers.CharField(read_only=True)
    created_by = UserSerializer(read_only=True)
    sub_items = WorkItemListSerializer(many=True, read_only=True)

    class Meta:
        model = WorkItem
        fields = [
            "id", "identifier", "project", "number", "title", "description", "description_html",
            "item_type", "state", "priority", "cycle", "parent", "sub_items", "assignees", "assignee_ids",
            "labels", "label_ids", "attachments", "comments", "created_by", "story_points",
            "due_date", "completed_at", "created_at", "updated_at",
        ]
        read_only_fields = ["number"]


class SavedViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedView
        fields = [
            "id", "project", "name", "layout", "filters", "group_by",
            "sort_by", "created_by", "is_default", "created_at",
        ]
