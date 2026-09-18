from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.views import WorkspaceViewSet, ProjectViewSet, LabelViewSet, MeView
from workitems.views import (
    WorkflowStateViewSet, WorkItemViewSet, AttachmentViewSet,
    CommentViewSet, ActivityLogViewSet, SavedViewViewSet,
)
from cycles.views import CycleViewSet
from pages.views import PageViewSet
from analytics.views import ProjectAnalyticsView

admin.site.site_header = "Best Life Apps — Project Management Admin"
admin.site.site_title = "Best Life Apps Admin"
admin.site.index_title = "Administration"

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"labels", LabelViewSet, basename="label")
router.register(r"states", WorkflowStateViewSet, basename="state")
router.register(r"work-items", WorkItemViewSet, basename="workitem")
router.register(r"attachments", AttachmentViewSet, basename="attachment")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"activity", ActivityLogViewSet, basename="activity")
router.register(r"views", SavedViewViewSet, basename="savedview")
router.register(r"cycles", CycleViewSet, basename="cycle")
router.register(r"pages", PageViewSet, basename="page")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/me/", MeView.as_view({"get": "list"}), name="me"),
    path("api/analytics/projects/<uuid:project_id>/", ProjectAnalyticsView.as_view(), name="project-analytics"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
