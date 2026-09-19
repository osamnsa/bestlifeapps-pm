from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="integration",
            name="provider",
            field=models.CharField(
                choices=[("imap", "IMAP"), ("pop3", "POP3"), ("discord", "Discord")],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="integration",
            name="label",
            field=models.CharField(
                blank=True, default="",
                help_text="Friendly name, e.g. 'Support inbox' or 'Team Discord'",
                max_length=100,
            ),
        ),
        migrations.AlterField(
            model_name="integration",
            name="host",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AlterField(
            model_name="integration",
            name="port",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="integration",
            name="username",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="integration",
            name="guild_id",
            field=models.CharField(blank=True, default="", help_text="Discord server (guild) ID", max_length=32),
        ),
        migrations.AddField(
            model_name="integration",
            name="channel_id",
            field=models.CharField(blank=True, default="", help_text="Default channel ID for posting/reading messages", max_length=32),
        ),
    ]
