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
        fields = ['id', 'user', 'env', 'wnid', 'fnid', 'created_at', 'updated_at', 'frames']


class FrameSerializer(serializers.ModelSerializer):
    elements = serializers.PrimaryKeyRelatedField(many=True, queryset=Element.objects.all())

    class Meta:
        model = Frame
        fields = ['id', 'entity', 'fnid', 'created_at', 'updated_at', 'elements']


class ElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = ['id', 'frame', 'fnid', 'value', 'created_at', 'updated_at']
