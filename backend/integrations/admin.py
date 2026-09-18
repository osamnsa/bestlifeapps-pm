from django.contrib import admin
from .models import Integration


@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    list_display = ("label", "provider", "workspace", "status", "created_by", "created_at")
    list_filter = ("provider", "status", "workspace")
    readonly_fields = ("encrypted_password",)
