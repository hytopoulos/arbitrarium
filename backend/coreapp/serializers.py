import logging
from rest_framework import serializers
from coreapp.models import User, Environment, Entity, Frame, Element


class UserSerializer(serializers.ModelSerializer):
    environments = serializers.PrimaryKeyRelatedField(many=True, queryset=Environment.objects.all())

    class Meta:
        model = User
        fields = ['id', 'email', 'environments']


class EnvironmentSerializer(serializers.ModelSerializer):
    entities = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Entity.objects.all(),
        required=False  # Make entities optional
    )

    class Meta:
        model = Environment
        fields = ['id', 'user', 'name', 'description', 'created_at', 'updated_at', 'entities']
        read_only_fields = ['user']  # Make user read-only as it will be set from request
        
    def create(self, validated_data):
        # Remove entities from validated_data if present
        entities = validated_data.pop('entities', [])
        
        # Set the user from the request
        validated_data['user'] = self.context['request'].user
        
        # Create the environment
        environment = super().create(validated_data)
        
        # Add any entities if they were provided
        if entities:
            environment.entities.set(entities)
            
        return environment


class EntitySerializer(serializers.ModelSerializer):
    frames = serializers.PrimaryKeyRelatedField(many=True, queryset=Frame.objects)

    class Meta:
        model = Entity
        fields = ['id', 'user', 'env', 'name', 'wnid', 'fnid', 'created_at', 'updated_at', 'frames']


class FrameSerializer(serializers.ModelSerializer):
    elements = serializers.PrimaryKeyRelatedField(many=True, queryset=Element.objects.all(), required=False)
    framenet_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Frame
        fields = [
            'id', 'entity', 'fnid', 'name', 'framenet_name', 'definition', 'is_primary',
            'created_at', 'updated_at', 'elements', 'parent_frame'
        ]
        read_only_fields = ['created_at', 'updated_at', 'framenet_name']
    
    def get_framenet_name(self, obj):
        """
        Get the frame name from FrameNet.
        This will use the name property which fetches from FrameNet service.
        """
        if not obj.fnid:
            return None
        try:
            return obj.name
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not fetch FrameNet name for frame {obj.id}: {str(e)}")
            return None


class ElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = [
            'id', 'frame', 'fnid', 'name', 'core_type', 'definition',
            'value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
