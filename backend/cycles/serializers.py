from rest_framework import serializers
from .models import Cycle


class CycleSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    total_items = serializers.IntegerField(read_only=True, required=False)
    completed_items = serializers.IntegerField(read_only=True, required=False)
    total_points = serializers.IntegerField(read_only=True, required=False)
    completed_points = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Cycle
        fields = [
            "id", "project", "name", "description", "start_date", "end_date",
            "is_active", "total_items", "completed_items", "total_points",
            "completed_points", "created_at", "updated_at",
        ]
