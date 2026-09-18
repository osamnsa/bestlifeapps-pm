from django.contrib import admin
from .models import WorkflowState, WorkItem, Attachment, Comment, ActivityLog, SavedView

admin.site.register(WorkflowState)
admin.site.register(WorkItem)
admin.site.register(Attachment)
admin.site.register(Comment)
admin.site.register(ActivityLog)
admin.site.register(SavedView)
