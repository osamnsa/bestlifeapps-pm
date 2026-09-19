from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_invite"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="status",
            field=models.CharField(choices=[("active", "Active"), ("completed", "Completed")], default="active", max_length=20),
        ),
        migrations.AddField(
            model_name="project",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
