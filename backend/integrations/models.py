import uuid
from django.conf import settings
from django.db import models

from core.models import Workspace, TimeStampedModel
from .crypto import encrypt, decrypt


class Integration(TimeStampedModel):
    """A workspace-level connection to an external service.

    v1 supports IMAP/POP3 custom email accounts only (no OAuth needed).
    Future providers (gmail, github, google_calendar, ...) can reuse this
    same model by adding provider-specific fields or a JSON `extra` blob.
    """

    PROVIDER_CHOICES = [
        ("imap", "IMAP"),
        ("pop3", "POP3"),
    ]
    STATUS_CHOICES = [
        ("connected", "Connected"),
        ("error", "Error"),
        ("untested", "Untested"),
    ]

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="integrations")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    label = models.CharField(max_length=100, blank=True, default="", help_text="Friendly name, e.g. 'Support inbox'")

    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField()
    username = models.CharField(max_length=255)
    encrypted_password = models.TextField(blank=True, default="")
    use_ssl = models.BooleanField(default=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="untested")
    last_error = models.TextField(blank=True, default="")
    last_tested_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_provider_display()} - {self.label or self.username}"

    def set_password(self, raw_password: str):
        self.encrypted_password = encrypt(raw_password)

    def get_password(self) -> str:
        return decrypt(self.encrypted_password)
