from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from .models import Workspace, WorkspaceMembership, Project, Label
from .serializers import (
    WorkspaceSerializer, ProjectSerializer, LabelSerializer, UserSerializer,
    ProfileUpdateSerializer, ChangePasswordSerializer,
)

User = get_user_model()


class MeView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        data = UserSerializer(request.user).data
        data["admin_workspace_ids"] = list(
            WorkspaceMembership.objects.filter(user=request.user, role="admin").values_list(
                "workspace_id", flat=True
            )
        )
        return Response(data)

    def partial_update(self, request, pk=None):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        data = UserSerializer(request.user).data
        return Response(data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated."}, status=status.HTTP_200_OK)


class SessionViewSet(viewsets.ViewSet):
    """Lists this user's active (non-blacklisted) refresh tokens and lets them
    be revoked individually — used by the Security tab in Settings."""

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        tokens = (
            OutstandingToken.objects.filter(user=request.user)
            .exclude(id__in=BlacklistedToken.objects.values_list("token_id", flat=True))
            .order_by("-created_at")
        )
        data = [
            {
                "id": t.id,
                "created_at": t.created_at,
                "expires_at": t.expires_at,
            }
            for t in tokens
        ]
        return Response(data)

    def destroy(self, request, pk=None):
        token = OutstandingToken.objects.filter(user=request.user, id=pk).first()
        if not token:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        BlacklistedToken.objects.get_or_create(token=token)
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        workspace = serializer.validated_data.get("workspace")
        is_admin = WorkspaceMembership.objects.filter(
            workspace=workspace, user=self.request.user, role="admin"
        ).exists()
        if not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only workspace admins can create projects.")
        project = serializer.save()
        project.members.add(self.request.user)


class LabelViewSet(viewsets.ModelViewSet):
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project"]

    def get_queryset(self):
        return Label.objects.filter(project__workspace__members=self.request.user)
