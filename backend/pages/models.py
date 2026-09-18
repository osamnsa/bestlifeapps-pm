from django.conf import settings
from django.db import models
from core.models import TimeStampedModel, Project


class Page(TimeStampedModel):
    """A documentation / notes page (built-in wiki, similar to Notion-style docs)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="pages")
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="children")
    title = models.CharField(max_length=255, default="Untitled")
    content = models.JSONField(default=dict, blank=True, help_text="Rich text editor document (JSON).")
    content_html = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=10, blank=True, default="\U0001F4C4")
    is_archived = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title
