from django.conf import settings
from django.db import models
from core.models import TimeStampedModel, Project, Label
from cycles.models import Cycle


class WorkflowState(TimeStampedModel):
    """A column/status in a project's Kanban board (e.g. Backlog, Todo, In Progress, Done, Cancelled)."""
    GROUP_CHOICES = [
        ("backlog", "Backlog"),
        ("unstarted", "Unstarted"),
        ("started", "Started"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="states")
    name = models.CharField(max_length=100)
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, default="unstarted")
    color = models.CharField(max_length=7, default="#94A3B8")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        unique_together = ("project", "name")

    def __str__(self):
        return f"{self.project.identifier} · {self.name}"


class WorkItem(TimeStampedModel):
    PRIORITY_CHOICES = [
        ("none", "None"), ("low", "Low"), ("medium", "Medium"),
        ("high", "High"), ("urgent", "Urgent"),
    ]
    TYPE_CHOICES = [("task", "Task"), ("bug", "Bug"), ("story", "Story"), ("epic", "Epic")]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="work_items")
    number = models.PositiveIntegerField(editable=False)
    title = models.CharField(max_length=500)
    description = models.JSONField(
        default=dict, blank=True,
        help_text="Rich text content stored as structured JSON (editor document)."
    )
    description_html = models.TextField(blank=True, default="", help_text="Rendered HTML cache for search/preview.")
    item_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="task")
    state = models.ForeignKey(WorkflowState, on_delete=models.PROTECT, related_name="work_items")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="none")
    cycle = models.ForeignKey(Cycle, on_delete=models.SET_NULL, null=True, blank=True, related_name="work_items")
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="sub_items")
    assignees = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="assigned_items", blank=True)
    labels = models.ManyToManyField(Label, related_name="work_items", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_items"
    )
    story_points = models.PositiveIntegerField(default=0)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("project", "number")

    def __str__(self):
        return f"{self.project.identifier}-{self.number}: {self.title}"

    @property
    def identifier(self):
        return f"{self.project.identifier}-{self.number}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self.project.allocate_item_number()
        if self.state and self.state.group == "completed" and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        if self.state and self.state.group != "completed":
            self.completed_at = None
        super().save(*args, **kwargs)


class Attachment(TimeStampedModel):
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="attachments/%Y/%m/")
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name.split("/")[-1]
        if self.file:
            try:
                self.file_size = self.file.size
            except Exception:
                pass
        super().save(*args, **kwargs)


class Comment(TimeStampedModel):
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    body = models.JSONField(default=dict, blank=True)
    body_html = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["created_at"]


class ActivityLog(TimeStampedModel):
    """Lightweight audit trail used for analytics + activity feed."""
    work_item = models.ForeignKey(WorkItem, on_delete=models.CASCADE, related_name="activity")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    verb = models.CharField(max_length=255)
    field = models.CharField(max_length=100, blank=True, default="")
    old_value = models.CharField(max_length=500, blank=True, default="")
    new_value = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]


class SavedView(TimeStampedModel):
    """A customizable, filterable view (Kanban / List / Calendar) that can be saved and reused."""
    LAYOUT_CHOICES = [("kanban", "Kanban"), ("list", "List"), ("calendar", "Calendar")]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="views")
    name = models.CharField(max_length=255)
    layout = models.CharField(max_length=20, choices=LAYOUT_CHOICES, default="kanban")
    filters = models.JSONField(default=dict, blank=True, help_text="Filter config: assignees, labels, priority, cycle, etc.")
    group_by = models.CharField(max_length=50, default="state")
    sort_by = models.CharField(max_length=50, default="-created_at")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
