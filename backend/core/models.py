import secrets
import uuid
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Workspace(TimeStampedModel):
    """Top-level tenant/org container."""
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="WorkspaceMembership", related_name="workspaces"
    )

    def __str__(self):
        return self.name


class WorkspaceMembership(TimeStampedModel):
    ROLE_CHOICES = [("admin", "Admin"), ("member", "Member"), ("viewer", "Viewer")]
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")

    class Meta:
        unique_together = ("workspace", "user")


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(24)


def _default_invite_expiry():
    return timezone.now() + timedelta(days=7)


class Invite(TimeStampedModel):
    """A shareable link-based invitation to join a workspace.

    Unlike a traditional email invite, no message is sent by the platform —
    the admin generates the link and shares it themselves (email, Discord,
    WhatsApp, wherever). Anyone holding a valid, unexpired, pending link can
    accept it by logging in or registering.
    """

    STATUS_CHOICES = [("pending", "Pending"), ("accepted", "Accepted"), ("revoked", "Revoked")]

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="invites")
    email = models.EmailField(blank=True, default="", help_text="Informational only — not enforced on accept.")
    role = models.CharField(max_length=20, choices=WorkspaceMembership.ROLE_CHOICES, default="member")
    token = models.CharField(max_length=64, unique=True, default=_generate_invite_token)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=_default_invite_expiry)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invite to {self.workspace.name} ({self.role}) - {self.status}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        return self.status == "pending" and not self.is_expired

    def regenerate(self):
        """Used by 'resend': issue a fresh token and reset the expiry/status."""
        self.token = _generate_invite_token()
        self.expires_at = _default_invite_expiry()
        self.status = "pending"
        self.accepted_by = None
        self.accepted_at = None
        self.save(update_fields=["token", "expires_at", "status", "accepted_by", "accepted_at"])


class Project(TimeStampedModel):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=255)
    identifier = models.CharField(max_length=10, help_text="Short prefix e.g. ENG, OPS")
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=10, blank=True, default="\U0001F4C1")
    color = models.CharField(max_length=7, blank=True, default="#6366F1")
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="projects", blank=True)
    next_item_number = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("workspace", "identifier")
        ordering = ["name"]

    def __str__(self):
        return f"{self.identifier} - {self.name}"

    def allocate_item_number(self):
        num = self.next_item_number
        self.next_item_number += 1
        self.save(update_fields=["next_item_number"])
        return num


class Label(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="labels")
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#94A3B8")

    class Meta:
        unique_together = ("project", "name")

    def __str__(self):
        return self.name
