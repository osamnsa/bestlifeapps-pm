import uuid
import django.db.models.deletion
import core.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Invite",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("email", models.EmailField(blank=True, default="", help_text="Informational only — not enforced on accept.", max_length=254)),
                ("role", models.CharField(choices=[("admin", "Admin"), ("member", "Member"), ("viewer", "Viewer")], default="member", max_length=20)),
                ("token", models.CharField(default=core.models._generate_invite_token, max_length=64, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("revoked", "Revoked")], default="pending", max_length=20)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(default=core.models._default_invite_expiry)),
                ("accepted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("invited_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invites", to="core.workspace")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
