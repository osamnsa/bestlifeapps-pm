import django_filters as filters
from .models import WorkItem


class WorkItemFilter(filters.FilterSet):
    assignees = filters.CharFilter(method="filter_assignees")
    labels = filters.CharFilter(method="filter_labels")
    state = filters.CharFilter(field_name="state__id")
    state_group = filters.CharFilter(field_name="state__group")
    priority = filters.CharFilter(field_name="priority")
    cycle = filters.CharFilter(field_name="cycle__id")
    item_type = filters.CharFilter(field_name="item_type")
    due_before = filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_after = filters.DateFilter(field_name="due_date", lookup_expr="gte")

    class Meta:
        model = WorkItem
        fields = ["project", "state", "priority", "cycle", "item_type"]

    def filter_assignees(self, queryset, name, value):
        ids = [v for v in value.split(",") if v]
        return queryset.filter(assignees__id__in=ids).distinct()

    def filter_labels(self, queryset, name, value):
        ids = [v for v in value.split(",") if v]
        return queryset.filter(labels__id__in=ids).distinct()
