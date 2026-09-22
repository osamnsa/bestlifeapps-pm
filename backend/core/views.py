from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Workspace, WorkspaceMembership, Project, Label, Invite
from .serializers import (
    WorkspaceSerializer, ProjectSerializer, LabelSerializer, UserSerializer,
    ProfileUpdateSerializer, ChangePasswordSerializer, CreateMemberSerializer,
    InviteSerializer, InvitePreviewSerializer, AcceptInviteSerializer,
)

User = get_user_model()


def _require_admin(user, workspace):
    is_admin = WorkspaceMembership.objects.filter(workspace=workspace, user=user, role="admin").exists()
    if not is_admin:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Only workspace admins can do that.")


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

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        workspace = self.get_object()
        memberships = WorkspaceMembership.objects.filter(workspace=workspace).select_related("user")
        data = [
            {"id": m.id, "user": UserSerializer(m.user).data, "role": m.role}
            for m in memberships
        ]
        return Response(data)

    @action(detail=True, methods=["post"], url_path="create-member")
    def create_member(self, request, pk=None):
        """Admin-only: create a brand new login directly and add it to this
        workspace immediately — no invite link or email required."""
        workspace = self.get_object()
        _require_admin(request.user, workspace)
        serializer = CreateMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data["role"]
        user = serializer.save()
        membership = WorkspaceMembership.objects.create(workspace=workspace, user=user, role=role)
        return Response(
            {"id": str(membership.id), "user": UserSerializer(user).data, "role": membership.role},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path=r"members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        """Admin-only: removes a user's access to this workspace only — their
        account keeps working in any other workspace they belong to. They are
        also unassigned from this workspace's projects and work items. Blocked
        if they're the workspace's last remaining admin."""
        workspace = self.get_object()
        _require_admin(request.user, workspace)
        membership = WorkspaceMembership.objects.filter(workspace=workspace, user_id=user_id).first()
        if not membership:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if membership.role == "admin":
            other_admins_exist = (
                WorkspaceMembership.objects.filter(workspace=workspace, role="admin")
                .exclude(id=membership.id)
                .exists()
            )
            if not other_admins_exist:
                return Response(
                    {"detail": "You can't remove the last admin of a workspace."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user = membership.user
        for project in Project.objects.filter(workspace=workspace, members=user):
            project.members.remove(user)

        from workitems.models import WorkItem  # local import avoids a circular import with core
        for work_item in WorkItem.objects.filter(project__workspace=workspace, assignees=user):
            work_item.assignees.remove(user)

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["workspace", "status"]
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
        _require_admin(self.request.user, workspace)
        project = serializer.save()
        project.members.add(self.request.user)

    def perform_destroy(self, instance):
        _require_admin(self.request.user, instance.workspace)
        instance.delete()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        project = self.get_object()
        _require_admin(request.user, project.workspace)
        project.mark_completed()
        return Response(ProjectSerializer(project, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        project = self.get_object()
        _require_admin(request.user, project.workspace)
        project.reopen()
        return Response(ProjectSerializer(project, context={"request": request}).data)


class LabelViewSet(viewsets.ModelViewSet):
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project"]

    def get_queryset(self):
        return Label.objects.filter(project__workspace__members=self.request.user)


class InviteViewSet(viewsets.ModelViewSet):
    """Admin-only management of shareable invite links. Accepting an invite
    happens through the separate public AcceptInviteView below."""

    serializer_class = InviteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["workspace", "status"]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        admin_workspace_ids = WorkspaceMembership.objects.filter(
            user=self.request.user, role="admin"
        ).values_list("workspace_id", flat=True)
        return Invite.objects.filter(workspace_id__in=admin_workspace_ids)

    def perform_create(self, serializer):
        workspace = serializer.validated_data.get("workspace")
        _require_admin(self.request.user, workspace)
        serializer.save(invited_by=self.request.user)

    def perform_destroy(self, instance):
        _require_admin(self.request.user, instance.workspace)
        instance.status = "revoked"
        instance.save(update_fields=["status"])

    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        invite = self.get_object()
        _require_admin(request.user, invite.workspace)
        invite.regenerate()
        return Response(InviteSerializer(invite).data)


class AcceptInviteView(APIView):
    """Public endpoint (no auth) a new teammate lands on via their invite link."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        invite = Invite.objects.filter(token=token).select_related("workspace").first()
        if not invite:
            return Response({"detail": "Invite not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvitePreviewSerializer(invite).data)

    def post(self, request, token):
        invite = Invite.objects.filter(token=token).select_related("workspace").first()
        if not invite:
            return Response({"detail": "Invite not found."}, status=status.HTTP_404_NOT_FOUND)
        if not invite.is_valid:
            return Response(
                {"detail": "This invite has expired or is no longer valid."},
                status=status.HTTP_410_GONE,
            )

        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        WorkspaceMembership.objects.update_or_create(
            workspace=invite.workspace, user=user, defaults={"role": invite.role}
        )
        invite.status = "accepted"
        invite.accepted_by = user
        invite.accepted_at = timezone.now()
        invite.save(update_fields=["status", "accepted_by", "accepted_at"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "workspace": {"id": str(invite.workspace.id), "name": invite.workspace.name},
            },
            status=status.HTTP_200_OK,
        )
