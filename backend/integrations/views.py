import imaplib
import poplib
import socket

from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import WorkspaceMembership
from .models import Integration
from .serializers import IntegrationSerializer
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
