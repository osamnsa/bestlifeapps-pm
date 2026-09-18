from django.db import models
from core.models import TimeStampedModel, Project


class Cycle(TimeStampedModel):
    """A sprint/iteration with a fixed time-box, used for burndown tracking."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="cycles")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.project.identifier} · {self.name}"

    @property
    def is_active(self):
        from django.utils import timezone
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date
