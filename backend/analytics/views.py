from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Project
from workitems.models import WorkItem
from cycles.models import Cycle


class ProjectAnalyticsView(APIView):
    """Real-time snapshot of a project's health: status breakdown, priority mix,
    assignee workload, cycle velocity trend, and completion over time."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project = Project.objects.filter(
            id=project_id, workspace__members=request.user
        ).first()
        if not project:
            return Response({"detail": "Not found."}, status=404)

        items = WorkItem.objects.filter(project=project)

        by_state = list(
            items.values("state__name", "state__color", "state__group")
            .annotate(count=Count("id"))
            .order_by("state__order")
        )
        by_priority = list(
            items.values("priority").annotate(count=Count("id")).order_by("priority")
        )
        by_type = list(
            items.values("item_type").annotate(count=Count("id")).order_by("item_type")
        )
        by_assignee = list(
            items.filter(assignees__isnull=False)
            .values("assignees__id", "assignees__username")
            .annotate(
                total=Count("id", distinct=True),
                completed=Count("id", filter=Q(state__group="completed"), distinct=True),
            )
        )

        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        completed_trend = []
        for i in range(30, -1, -1):
            day = today - timedelta(days=i)
            count = items.filter(completed_at__date=day).count()
            completed_trend.append({"date": day.isoformat(), "completed": count})

        cycles = Cycle.objects.filter(project=project).order_by("start_date")
        velocity = []
        for cycle in cycles:
            cycle_items = items.filter(cycle=cycle)
            completed_points = sum(
                (wi.story_points or 0) for wi in cycle_items if wi.completed_at
            )
            velocity.append({
                "cycle": cycle.name,
                "start_date": cycle.start_date,
                "completed_points": completed_points,
                "total_points": sum(wi.story_points or 0 for wi in cycle_items),
            })

        total = items.count()
        completed = items.filter(state__group="completed").count()

        return Response({
            "project": project.name,
            "total_work_items": total,
            "completed_work_items": completed,
            "completion_rate": round((completed / total) * 100, 1) if total else 0,
            "by_state": by_state,
            "by_priority": by_priority,
            "by_type": by_type,
            "by_assignee": by_assignee,
            "completed_trend": completed_trend,
            "velocity": velocity,
        })
