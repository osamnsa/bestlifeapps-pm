import imaplib
import poplib
import socket

from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import WorkspaceMembership
from .models import Integration, McpSettings
from .serializers import IntegrationSerializer, McpSettingsSerializer
from . import discord_client


def _test_connection(integration: Integration) -> tuple[bool, str]:
    """Attempts a real connection check against the configured provider.
    Returns (success, error_message)."""
    secret = integration.get_password()
    try:
        if integration.provider == "imap":
            cls = imaplib.IMAP4_SSL if integration.use_ssl else imaplib.IMAP4
            conn = cls(integration.host, integration.port, timeout=10)
            try:
                conn.login(integration.username, secret)
            finally:
                try:
                    conn.logout()
                except Exception:
                    pass
        elif integration.provider == "pop3":
            cls = poplib.POP3_SSL if integration.use_ssl else poplib.POP3
            conn = cls(integration.host, integration.port, timeout=10)
            try:
                conn.user(integration.username)
                conn.pass_(secret)
            finally:
                try:
                    conn.quit()
                except Exception:
                    pass
        elif integration.provider == "discord":
            return discord_client.verify_guild_access(secret, integration.guild_id)
        else:
            return False, f"Unsupported provider: {integration.provider}"
        return True, ""
    except (imaplib.IMAP4.error, poplib.error_proto) as exc:
        return False, f"Authentication failed: {exc}"
    except (socket.timeout, socket.gaierror, ConnectionRefusedError, OSError) as exc:
        return False, f"Could not reach server: {exc}"
    except Exception as exc:  # noqa: BLE001 - surface any unexpected failure to the user
        return False, str(exc)


class IntegrationViewSet(viewsets.ModelViewSet):
    serializer_class = IntegrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["workspace", "provider"]

    def get_queryset(self):
        return Integration.objects.filter(workspace__members=self.request.user)

    def perform_create(self, serializer):
        workspace = serializer.validated_data.get("workspace")
        is_admin = WorkspaceMembership.objects.filter(
            workspace=workspace, user=self.request.user, role="admin"
        ).exists()
        if not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only workspace admins can connect integrations.")
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        integration = self.get_object()
        success, error = _test_connection(integration)
        integration.status = "connected" if success else "error"
        integration.last_error = error
        integration.last_tested_at = timezone.now()
        integration.save(update_fields=["status", "last_error", "last_tested_at"])
        return Response(IntegrationSerializer(integration).data, status=status.HTTP_200_OK)


def _require_workspace_admin(user, workspace):
    is_admin = WorkspaceMembership.objects.filter(workspace=workspace, user=user, role="admin").exists()
    if not is_admin:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Only workspace admins can manage the Sarah-OS MCP connection.")


class McpSettingsViewSet(viewsets.ViewSet):
    """Admin-managed Sarah-OS MCP connection settings, one per workspace.

    Any workspace member can view status (is_enabled/is_configured); only
    admins can rotate the secret or toggle it on/off. A separate /live/
    endpoint (admin-only, JWT-authenticated) is what the sarah-mcp Node
    service itself calls to fetch the current plaintext secret.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_or_create(self, workspace):
        settings_obj, _ = McpSettings.objects.get_or_create(workspace=workspace)
        return settings_obj

    def list(self, request):
        workspace_id = request.query_params.get("workspace")
        if not workspace_id:
            return Response({"detail": "workspace query param is required."}, status=status.HTTP_400_BAD_REQUEST)
        from core.models import Workspace
        workspace = Workspace.objects.filter(id=workspace_id, members=request.user).first()
        if not workspace:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        settings_obj = self._get_or_create(workspace)
        return Response(McpSettingsSerializer(settings_obj).data)

    @action(detail=False, methods=["post"], url_path="rotate")
    def rotate(self, request):
        workspace_id = request.data.get("workspace")
        from core.models import Workspace
        workspace = Workspace.objects.filter(id=workspace_id, members=request.user).first()
        if not workspace:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        _require_workspace_admin(request.user, workspace)
        settings_obj = self._get_or_create(workspace)
        plaintext = settings_obj.rotate()
        data = McpSettingsSerializer(settings_obj).data
        data["secret"] = plaintext  # shown exactly once — the frontend must not persist this
        return Response(data)

    @action(detail=False, methods=["post"], url_path="toggle")
    def toggle(self, request):
        workspace_id = request.data.get("workspace")
        from core.models import Workspace
        workspace = Workspace.objects.filter(id=workspace_id, members=request.user).first()
        if not workspace:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        _require_workspace_admin(request.user, workspace)
        settings_obj = self._get_or_create(workspace)
        settings_obj.is_enabled = not settings_obj.is_enabled
        settings_obj.save(update_fields=["is_enabled", "updated_at"])
        return Response(McpSettingsSerializer(settings_obj).data)

    @action(detail=False, methods=["get"], url_path="live")
    def live(self, request):
        """Called by the sarah-mcp Node service (authenticated as sarah-os)
        to fetch the current enabled secrets for every workspace it admins."""
        admin_workspace_ids = WorkspaceMembership.objects.filter(
            user=request.user, role="admin"
        ).values_list("workspace_id", flat=True)
        settings_qs = McpSettings.objects.filter(
            workspace_id__in=admin_workspace_ids, is_enabled=True
        ).exclude(encrypted_secret="")
        secrets_list = [s.get_secret() for s in settings_qs]
        return Response({"secrets": secrets_list})
