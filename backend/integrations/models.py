import uuid
from django.conf import settings
from django.db import models

from core.models import Workspace, TimeStampedModel
from .crypto import encrypt, decrypt


class Integration(TimeStampedModel):
    """A workspace-level connection to an external service.

    Providers so far:
      - imap / pop3: custom email accounts (host/port/username/password)
      - discord: a Discord server, connected via bot token (guild_id/channel_id)

    Future providers (gmail, github, google_calendar, whatsapp, ...) can reuse
    this same model by adding provider-specific fields or a JSON `extra` blob.
    """

    PROVIDER_CHOICES = [
        ("imap", "IMAP"),
        ("pop3", "POP3"),
        ("discord", "Discord"),
    ]
    STATUS_CHOICES = [
        ("connected", "Connected"),
        ("error", "Error"),
        ("untested", "Untested"),
    ]

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="integrations")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    label = models.CharField(max_length=100, blank=True, default="", help_text="Friendly name, e.g. 'Support inbox' or 'Team Discord'")

    # IMAP/POP3 fields
    host = models.CharField(max_length=255, blank=True, default="")
    port = models.PositiveIntegerField(null=True, blank=True)
    username = models.CharField(max_length=255, blank=True, default="")
    use_ssl = models.BooleanField(default=True)

    # Discord fields
    guild_id = models.CharField(max_length=32, blank=True, default="", help_text="Discord server (guild) ID")
    channel_id = models.CharField(max_length=32, blank=True, default="", help_text="Default channel ID for posting/reading messages")

    # Shared secret storage (mail password or Discord bot token), encrypted at rest.
    encrypted_password = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="untested")
    last_error = models.TextField(blank=True, default="")
    last_tested_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_provider_display()} - {self.label or self.username or self.guild_id}"

    def set_password(self, raw_password: str):
        self.encrypted_password = encrypt(raw_password)

    def get_password(self) -> str:
        return decrypt(self.encrypted_password)
