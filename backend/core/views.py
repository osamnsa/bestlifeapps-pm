from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import viewsets, permissions
from .models import Workspace, Project, Label
from .serializers import WorkspaceSerializer, ProjectSerializer, LabelSerializer, UserSerializer

User = get_user_model()


class MeView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return_data = UserSerializer(request.user).data
        from rest_framework.response import Response
        return Response(return_data)


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(members=self.request.user).prefetch_related("projects")


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["workspace"]
    search_fields = ["name", "identifier"]

    def get_queryset(self):
        return (
            Project.objects.filter(workspace__members=self.request.user)
            .annotate(work_item_count=Count("work_items", distinct=True))
            .prefetch_related("members", "labels")
            .distinct()
        )

    def perform_create(self, serializer):
        project = serializer.save()
        project.members.add(self.request.user)


class LabelViewSet(viewsets.ModelViewSet):
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project"]

    def get_queryset(self):
        return Label.objects.filter(project__workspace__members=self.request.user)
