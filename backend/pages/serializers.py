from rest_framework import serializers
from core.serializers import UserSerializer
from .models import Page


class PageSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Page
        fields = [
            "id", "project", "parent", "title", "content", "content_html",
            "icon", "is_archived", "created_by", "created_at", "updated_at",
        ]
