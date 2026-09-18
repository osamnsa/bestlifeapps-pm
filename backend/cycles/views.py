from datetime import timedelta
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Cycle
from .serializers import CycleSerializer


class CycleViewSet(viewsets.ModelViewSet):
    serializer_class = CycleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project"]

    def get_queryset(self):
        return (
            Cycle.objects.filter(project__workspace__members=self.request.user)
            .annotate(
                total_items=Count("work_items", distinct=True),
                completed_items=Count(
                    "work_items", filter=Q(work_items__state__group="completed"), distinct=True
                ),
                total_points=Sum("work_items__story_points"),
                completed_points=Sum(
                    "work_items__story_points", filter=Q(work_items__state__group="completed")
                ),
            )
        )

    @action(detail=True, methods=["get"])
    def burndown(self, request, pk=None):
        """Ideal vs actual burndown chart data, based on remaining story points per day."""
        cycle = self.get_object()
        work_items = cycle.work_items.all()
        total_points = sum(wi.story_points or 1 for wi in work_items)
        total_days = (cycle.end_date - cycle.start_date).days
        total_days = max(total_days, 1)

        ideal, actual = [], []
        today = timezone.now().date()
        remaining = total_points

        for day_offset in range(total_days + 1):
            date = cycle.start_date + timedelta(days=day_offset)
            ideal_remaining = round(total_points - (total_points / total_days) * day_offset, 1)
            ideal.append({"date": date.isoformat(), "remaining": max(ideal_remaining, 0)})

            if date <= today:
                completed_by_date = sum(
                    (wi.story_points or 1)
                    for wi in work_items
                    if wi.completed_at and wi.completed_at.date() <= date
                )
                actual_remaining = total_points - completed_by_date
                actual.append({"date": date.isoformat(), "remaining": actual_remaining})

        return Response({
            "cycle": cycle.name,
            "start_date": cycle.start_date,
            "end_date": cycle.end_date,
            "total_points": total_points,
            "ideal": ideal,
            "actual": actual,
        })
