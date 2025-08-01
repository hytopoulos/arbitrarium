from rest_framework import serializers
from coreapp.models import User, Environment, Entity, Frame, Element


class UserSerializer(serializers.ModelSerializer):
    environments = serializers.PrimaryKeyRelatedField(many=True, queryset=Environment.objects.all())

    class Meta:
        model = User
        fields = ['id', 'email', 'environments']


class EnvironmentSerializer(serializers.ModelSerializer):
    entities = serializers.PrimaryKeyRelatedField(many=True, queryset=Entity.objects.all())

    class Meta:
        model = Environment
        fields = ['id', 'user', 'name', 'description', 'created_at', 'updated_at', 'entities']


class EntitySerializer(serializers.ModelSerializer):
    frames = serializers.PrimaryKeyRelatedField(many=True, queryset=Frame.objects)

    class Meta:
        model = Entity
        fields = ['id', 'user', 'env', 'name', 'wnid', 'fnid', 'created_at', 'updated_at', 'frames']


class FrameSerializer(serializers.ModelSerializer):
    elements = serializers.PrimaryKeyRelatedField(many=True, queryset=Element.objects.all())

    class Meta:
        model = Frame
        fields = [
            'id', 'entity', 'fnid', 'name', 'definition', 'is_primary',
            'created_at', 'updated_at', 'elements'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = [
            'id', 'frame', 'fnid', 'name', 'core_type', 'definition',
            'value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
