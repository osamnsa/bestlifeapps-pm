import uuid
from django.conf import settings
from django.db import models


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
