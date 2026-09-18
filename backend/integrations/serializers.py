from rest_framework import serializers
from .models import Integration


class IntegrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Integration
        fields = [
            "id", "workspace", "provider", "label", "host", "port", "username",
            "password", "use_ssl", "status", "last_error", "last_tested_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["status", "last_error", "last_tested_at"]

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
