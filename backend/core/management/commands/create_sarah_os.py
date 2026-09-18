"""
Provisions the Sarah-OS integration account.

Sarah-OS is an external AI agent that assists in managing this project. This
command creates (or updates) a Django superuser for her, and ensures she is
an admin member of every existing workspace/project so she has full visibility
and write access across all current and future work.

Usage:
    python manage.py create_sarah_os --password "<24-char-password>"

If --password is omitted, a secure random 24-character password is generated
and printed once (it is not stored anywhere in plaintext).
"""
import secrets
import string

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import Workspace, WorkspaceMembership, Project

User = get_user_model()

SARAH_USERNAME = "sarah-os"
SARAH_EMAIL = "sarah-os@bestlifeapps.dev"

ALPHABET = string.ascii_lowercase + string.ascii_uppercase + string.digits + "!@#$%^&*()-_=+"


def generate_password(length: int = 24) -> str:
    while True:
        pw = "".join(secrets.choice(ALPHABET) for _ in range(length))
        if (
            any(c.islower() for c in pw)
            and any(c.isupper() for c in pw)
            and any(c.isdigit() for c in pw)
            and any(c in "!@#$%^&*()-_=+" for c in pw)
        ):
            return pw


class Command(BaseCommand):
    help = "Create or update the Sarah-OS integration superuser and grant her admin access everywhere."

    def add_arguments(self, parser):
        parser.add_argument("--password", type=str, default=None, help="Explicit password to set (24+ chars recommended).")

    def handle(self, *args, **options):
        password = options["password"] or generate_password(24)

        sarah, created = User.objects.get_or_create(
            username=SARAH_USERNAME,
            defaults={
                "email": SARAH_EMAIL,
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Sarah",
                "last_name": "OS",
            },
        )
        # Always ensure she has full admin rights, even if the account already existed.
        sarah.is_staff = True
        sarah.is_superuser = True
        sarah.is_active = True
        sarah.set_password(password)
        sarah.save()

        # Grant admin membership on every existing workspace and project so she has
        # full visibility/write access now, and automatically on anything created later
        # via the same onboarding flow used for human admins.
        for workspace in Workspace.objects.all():
            WorkspaceMembership.objects.update_or_create(
                workspace=workspace, user=sarah, defaults={"role": "admin"}
            )
        for project in Project.objects.all():
            project.members.add(sarah)

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Sarah-OS superuser: {SARAH_USERNAME}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated existing Sarah-OS superuser: {SARAH_USERNAME}"))

        if not options["password"]:
            self.stdout.write(self.style.WARNING(f"Generated password (store this now, it will not be shown again): {password}"))
