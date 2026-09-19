from rest_framework import serializers
from .models import Integration, McpSettings


class IntegrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        help_text="Mail password for imap/pop3, or bot token for discord.",
    )

    class Meta:
        model = Integration
        fields = [
            "id", "workspace", "provider", "label", "host", "port", "username",
            "password", "use_ssl", "guild_id", "channel_id",
            "status", "last_error", "last_tested_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["status", "last_error", "last_tested_at"]

    def validate(self, attrs):
        provider = attrs.get("provider") or getattr(self.instance, "provider", None)
        if provider in ("imap", "pop3"):
            for field in ("host", "port", "username"):
                value = attrs.get(field) or getattr(self.instance, field, None)
                if not value:
                    raise serializers.ValidationError({field: "This field is required for IMAP/POP3."})
        elif provider == "discord":
            for field in ("guild_id",):
                value = attrs.get(field) or getattr(self.instance, field, None)
                if not value:
                    raise serializers.ValidationError({field: "Server (guild) ID is required for Discord."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", "")
        instance = Integration(**validated_data)
        instance.set_password(password)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class McpSettingsSerializer(serializers.ModelSerializer):
    """Admin-facing view — the secret itself is never returned here, only
    whether one is configured. Use the /rotate/ action to see it once."""
    is_configured = serializers.BooleanField(read_only=True)

    class Meta:
        model = McpSettings
        fields = ["id", "workspace", "is_enabled", "is_configured", "rotated_at", "updated_at"]
        read_only_fields = ["is_configured", "rotated_at", "updated_at"]
