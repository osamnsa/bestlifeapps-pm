import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Integration",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("provider", models.CharField(choices=[("imap", "IMAP"), ("pop3", "POP3")], max_length=20)),
                ("label", models.CharField(blank=True, default="", help_text="Friendly name, e.g. 'Support inbox'", max_length=100)),
                ("host", models.CharField(max_length=255)),
                ("port", models.PositiveIntegerField()),
                ("username", models.CharField(max_length=255)),
                ("encrypted_password", models.TextField(blank=True, default="")),
                ("use_ssl", models.BooleanField(default=True)),
                ("status", models.CharField(choices=[("connected", "Connected"), ("error", "Error"), ("untested", "Untested")], default="untested", max_length=20)),
                ("last_error", models.TextField(blank=True, default="")),
                ("last_tested_at", models.DateTimeField(blank=True, null=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="integrations", to="core.workspace")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
