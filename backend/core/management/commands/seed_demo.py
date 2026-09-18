import random
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Workspace, WorkspaceMembership, Project, Label
from workitems.models import WorkflowState, WorkItem, Comment
from cycles.models import Cycle
from pages.models import Page

User = get_user_model()

STATE_DEFS = [
    ("Backlog", "backlog", "#94A3B8"),
    ("Todo", "unstarted", "#64748B"),
    ("In Progress", "started", "#F59E0B"),
    ("In Review", "started", "#8B5CF6"),
    ("Done", "completed", "#22C55E"),
    ("Cancelled", "cancelled", "#EF4444"),
]

TASK_TITLES = [
    "Set up authentication flow", "Design Kanban board drag-and-drop", "Fix attachment upload bug",
    "Write onboarding documentation", "Implement burndown chart", "Add dark mode support",
    "Optimize work item list query", "Create cycle planning modal", "Add label filtering to board",
    "Improve mobile responsiveness", "Set up CI pipeline", "Add real-time analytics dashboard",
    "Refactor rich text editor toolbar", "Add comment mentions", "Write API documentation",
    "Add search across work items", "Support sub-tasks nesting", "Add CSV export for reports",
    "Improve empty states", "Add keyboard shortcuts",
]


class Command(BaseCommand):
    help = "Seed the database with demo workspace, project, cycles, states, and work items."

    def handle(self, *args, **options):
        admin, created = User.objects.get_or_create(
            username="admin", defaults={"email": "admin@openpm.dev", "is_staff": True, "is_superuser": True}
        )
        if created:
            admin.set_password("admin")
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created superuser admin/admin"))

        demo_users = []
        for uname in ["alex", "jordan", "sam"]:
            u, _ = User.objects.get_or_create(username=uname, defaults={"email": f"{uname}@openpm.dev"})
            u.set_password("password123")
            u.save()
            demo_users.append(u)

        workspace, _ = Workspace.objects.get_or_create(slug="bestlifeapps", defaults={"name": "Best Life Apps"})
        WorkspaceMembership.objects.get_or_create(workspace=workspace, user=admin, defaults={"role": "admin"})
        for u in demo_users:
            WorkspaceMembership.objects.get_or_create(workspace=workspace, user=u, defaults={"role": "member"})

        project, _ = Project.objects.get_or_create(
            workspace=workspace, identifier="ENG",
            defaults={"name": "Engineering", "description": "Core product engineering work.", "color": "#6366F1"},
        )
        project.members.add(admin, *demo_users)

        states = {}
        for i, (name, group, color) in enumerate(STATE_DEFS):
            state, _ = WorkflowState.objects.get_or_create(
                project=project, name=name, defaults={"group": group, "color": color, "order": i}
            )
            states[name] = state

        labels = {}
        for name, color in [("bug", "#EF4444"), ("feature", "#22C55E"), ("design", "#8B5CF6"), ("docs", "#F59E0B")]:
            label, _ = Label.objects.get_or_create(project=project, name=name, defaults={"color": color})
            labels[name] = label

        today = timezone.now().date()
        cycle1, _ = Cycle.objects.get_or_create(
            project=project, name="Cycle 1",
            defaults={"start_date": today - timedelta(days=20), "end_date": today - timedelta(days=6)},
        )
        cycle2, _ = Cycle.objects.get_or_create(
            project=project, name="Cycle 2",
            defaults={"start_date": today - timedelta(days=5), "end_date": today + timedelta(days=9)},
        )

        if not WorkItem.objects.filter(project=project).exists():
            state_names = list(states.keys())
            for i, title in enumerate(TASK_TITLES):
                state = states[random.choice(state_names)]
                cycle = random.choice([cycle1, cycle2, None])
                item = WorkItem.objects.create(
                    project=project,
                    title=title,
                    description={"type": "doc", "content": [{"type": "paragraph", "content": [
                        {"type": "text", "text": f"Details for: {title}"}
                    ]}]},
                    description_html=f"<p>Details for: {title}</p>",
                    item_type=random.choice(["task", "bug", "story"]),
                    state=state,
                    priority=random.choice(["none", "low", "medium", "high", "urgent"]),
                    cycle=cycle,
                    created_by=admin,
                    story_points=random.choice([1, 2, 3, 5, 8]),
                )
                item.assignees.add(random.choice(demo_users))
                item.labels.add(labels[random.choice(list(labels.keys()))])
                if state.group == "completed":
                    days_ago = random.randint(0, 15)
                    item.completed_at = timezone.now() - timedelta(days=days_ago)
                    item.save(update_fields=["completed_at"])
                if i % 4 == 0:
                    Comment.objects.create(
                        work_item=item, author=random.choice(demo_users),
                        body={"type": "doc", "content": []},
                        body_html="<p>Looks good, let's ship it!</p>",
                    )

        if not Page.objects.filter(project=project).exists():
            Page.objects.create(
                project=project, title="Getting Started", created_by=admin,
                content={"type": "doc", "content": [{"type": "paragraph", "content": [
                    {"type": "text", "text": "Welcome to Best Life Apps Project Management! This is your team's living documentation space."}
                ]}]},
                content_html="<p>Welcome to Best Life Apps Project Management! This is your team's living documentation space.</p>",
            )
            Page.objects.create(
                project=project, title="Engineering Handbook", created_by=admin,
                content={"type": "doc", "content": [{"type": "paragraph", "content": [
                    {"type": "text", "text": "Coding standards, review process, and release checklist."}
                ]}]},
                content_html="<p>Coding standards, review process, and release checklist.</p>",
            )

        self.stdout.write(self.style.SUCCESS(
            "Demo data seeded. Login with admin/admin (superuser) or alex/jordan/sam with password123."
        ))
