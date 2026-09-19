import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
        ("integrations", "0002_discord"),
    ]

    operations = [
        migrations.CreateModel(
            name="McpSettings",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("encrypted_secret", models.TextField(blank=True, default="")),
                ("is_enabled", models.BooleanField(default=True)),
                ("rotated_at", models.DateTimeField(blank=True, null=True)),
                ("workspace", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="mcp_settings", to="core.workspace")),
            ],
            options={
                "abstract": False,
            },
        ),
    ]
