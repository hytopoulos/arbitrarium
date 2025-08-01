"""
Tests for the Frame and Element serializers.
"""
import pytest
from coreapp.serializers import FrameSerializer, ElementSerializer

@pytest.mark.django_db
def test_frame_serializer(test_frame, test_entity, test_user):
    """Test serialization and deserialization of Frame model."""
    # Test serialization
    serializer = FrameSerializer(test_frame)
    data = serializer.data
    
    assert data['id'] == test_frame.id
    assert data['name'] == 'Test Frame'
    assert data['definition'] == 'A test frame definition'
    assert data['is_primary'] is True
    assert data['entity'] == test_entity.id
    assert 'created_at' in data
    assert 'updated_at' in data
    assert 'elements' in data  # Check that elements field is included
    
    # Test deserialization - include all required fields
    new_data = {
        'name': 'Updated Frame',
        'definition': 'Updated definition',
        'is_primary': False,
        'entity': test_entity.id,
        'elements': []  # Include empty elements list as it's required
    }
    
    serializer = FrameSerializer(instance=test_frame, data=new_data)
    assert serializer.is_valid(), f"Serializer errors: {serializer.errors}"
    updated_frame = serializer.save()
    
    assert updated_frame.name == 'Updated Frame'
    assert updated_frame.definition == 'Updated definition'
    assert updated_frame.is_primary is False

@pytest.mark.django_db
def test_frame_serializer_validation(test_entity):
    """Test validation in FrameSerializer."""
    # Missing required fields
    serializer = FrameSerializer(data={})
    assert not serializer.is_valid()
    # Check for specific error messages
    assert 'entity' in serializer.errors, "Entity field should be required"
    assert 'elements' in serializer.errors, "Elements field should be required"
    
    # Invalid entity ID
    serializer = FrameSerializer(data={
        'name': 'Invalid Entity',
        'entity': 9999,  # Non-existent ID
        'elements': []   # Required field
    })
    assert not serializer.is_valid()
    assert 'entity' in serializer.errors, "Should have entity validation error"
    
    # Valid data
    serializer = FrameSerializer(data={
        'name': 'Valid Frame',
        'entity': test_entity.id,
        'elements': []
    })
    assert serializer.is_valid(), f"Valid data should pass validation. Errors: {serializer.errors}"

@pytest.mark.django_db
def test_element_serializer(test_element, test_frame, test_user):
    """Test serialization and deserialization of Element model."""
    # Test serialization
    serializer = ElementSerializer(test_element)
    data = serializer.data
    
    assert data['id'] == test_element.id
    assert data['name'] == 'Test Element'
    assert data['core_type'] == 'core'
    assert data['definition'] == 'A test element definition'
    assert data['value'] == {'key': 'value'}
    assert data['frame'] == test_frame.id
    assert 'created_at' in data
    assert 'updated_at' in data
    
    # Test deserialization
    new_data = {
        'name': 'Updated Element',
        'core_type': 'peripheral',
        'definition': 'Updated definition',
        'value': {'new_key': 'new_value'},
        'frame': test_frame.id
    }
    
    serializer = ElementSerializer(instance=test_element, data=new_data)
    assert serializer.is_valid()
    updated_element = serializer.save()
    
    assert updated_element.name == 'Updated Element'
    assert updated_element.core_type == 'peripheral'
    assert updated_element.value == {'new_key': 'new_value'}

@pytest.mark.django_db
def test_element_serializer_validation(test_frame):
    """Test validation in ElementSerializer."""
    # Missing required fields
    serializer = ElementSerializer(data={})
    assert not serializer.is_valid()
    # Frame is the only required field in the serializer
    assert 'frame' in serializer.errors, "Frame field should be required"
    
    # Invalid core_type
    serializer = ElementSerializer(data={
        'name': 'Invalid Core Type',
        'core_type': 'invalid_type',
        'frame': test_frame.id
    })
    assert not serializer.is_valid()
    assert 'core_type' in serializer.errors, "Invalid core_type should be caught"
    
    # Valid core_type
    serializer = ElementSerializer(data={
        'name': 'Valid Element',
        'core_type': 'core',
        'frame': test_frame.id
    })
    assert serializer.is_valid(), f"Valid data should pass validation. Errors: {serializer.errors}"
    
    # Invalid frame ID
    serializer = ElementSerializer(data={
        'name': 'Invalid Frame',
        'core_type': 'core',
        'frame': 9999  # Non-existent ID
    })
    assert not serializer.is_valid()
    assert 'frame' in serializer.errors, "Non-existent frame ID should be caught"
