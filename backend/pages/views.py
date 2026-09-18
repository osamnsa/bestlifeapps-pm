from rest_framework import viewsets, permissions
from .models import Page
from .serializers import PageSerializer


class PageViewSet(viewsets.ModelViewSet):
    serializer_class = PageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["project", "parent", "is_archived"]
    search_fields = ["title", "content_html"]

    def get_queryset(self):
        return Page.objects.filter(project__workspace__members=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
