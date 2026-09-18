from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WorkflowState, WorkItem, Attachment, Comment, ActivityLog, SavedView
from .serializers import (
    WorkflowStateSerializer, WorkItemListSerializer, WorkItemDetailSerializer,
    AttachmentSerializer, CommentSerializer, ActivityLogSerializer, SavedViewSerializer,
)
from .filters import WorkItemFilter

TRACKED_FIELDS = ["title", "state_id", "priority", "cycle_id", "story_points", "due_date"]


class WorkflowStateViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowStateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project"]

    def get_queryset(self):
        return WorkflowState.objects.filter(project__workspace__members=self.request.user)


class WorkItemViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = WorkItemFilter
    search_fields = ["title", "description_html"]
    ordering_fields = ["created_at", "updated_at", "priority", "due_date", "story_points"]

    def get_queryset(self):
        return (
            WorkItem.objects.filter(project__workspace__members=self.request.user)
            .select_related("state", "project", "cycle", "created_by")
            .prefetch_related("assignees", "labels", "attachments", "comments", "sub_items")
            .distinct()
        )

    def get_serializer_class(self):
        if self.action in ("list",):
            return WorkItemListSerializer
        return WorkItemDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        before = {f: getattr(instance, f, None) for f in TRACKED_FIELDS}
        updated = serializer.save()
        for field in TRACKED_FIELDS:
            old_val, new_val = before.get(field), getattr(updated, field, None)
            if old_val != new_val:
                ActivityLog.objects.create(
                    work_item=updated, actor=self.request.user, verb="updated",
                    field=field, old_value=str(old_val), new_value=str(new_val),
                )

    @action(detail=True, methods=["post"])
    def upload_attachment(self, request, pk=None):
        work_item = self.get_object()
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        attachment = Attachment.objects.create(work_item=work_item, file=file_obj, uploaded_by=request.user)
        return Response(AttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["work_item"]

    def get_queryset(self):
        return Attachment.objects.filter(work_item__project__workspace__members=self.request.user)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["work_item"]

    def get_queryset(self):
        return Comment.objects.filter(work_item__project__workspace__members=self.request.user)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
        ActivityLog.objects.create(
            work_item=serializer.instance.work_item, actor=self.request.user, verb="commented",
        )


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["work_item"]

    def get_queryset(self):
        return ActivityLog.objects.filter(work_item__project__workspace__members=self.request.user)


class SavedViewViewSet(viewsets.ModelViewSet):
    serializer_class = SavedViewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "layout"]

    def get_queryset(self):
        return SavedView.objects.filter(project__workspace__members=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
