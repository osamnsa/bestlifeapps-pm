from django.contrib import admin
from .models import Workspace, WorkspaceMembership, Project, Label

admin.site.register(Workspace)
admin.site.register(WorkspaceMembership)
admin.site.register(Project)
admin.site.register(Label)
