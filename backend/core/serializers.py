from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Workspace, WorkspaceMembership, Project, Label

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Used for PATCH /api/me/ — self-service profile edits only."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email"]

    def validate_email(self, value):
        qs = User.objects.exclude(pk=self.instance.pk).filter(email__iexact=value)
        if value and qs.exists():
            raise serializers.ValidationError("That email is already in use.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context["request"].user)
        return value


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ["id", "project", "name", "color"]


class ProjectSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        source="members", queryset=User.objects.all(), many=True, write_only=True, required=False
    )
    labels = LabelSerializer(many=True, read_only=True)
    work_item_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Project
        fields = [
            "id", "workspace", "name", "identifier", "description", "icon", "color",
            "members", "member_ids", "labels", "work_item_count", "created_at", "updated_at",
        ]


class WorkspaceSerializer(serializers.ModelSerializer):
    projects = ProjectSerializer(many=True, read_only=True)
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "projects", "my_role", "created_at"]

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = WorkspaceMembership.objects.filter(workspace=obj, user=request.user).first()
        return membership.role if membership else None


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ["id", "workspace", "user", "role"]
