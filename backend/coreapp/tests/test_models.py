"""Tests for the core models."""
import pytest
from datetime import datetime
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.utils import timezone
from coreapp.models import Frame, Element, Environment, User, Entity

@pytest.mark.django_db
def test_create_frame(test_frame):
    """Test that a frame can be created with required fields."""
    assert Frame.objects.count() == 1
    assert test_frame.name == 'Test Frame'
    assert test_frame.is_primary is True
    assert 'Test Frame' in str(test_frame)  # Check that the name is in the string representation
    assert 'N/A' in str(test_frame)  # Check that the ID is in the string representation

@pytest.mark.django_db
def test_frame_validation(test_entity):
    """Test frame validation, particularly for primary frame uniqueness."""
    # Create a primary frame
    frame1 = Frame.objects.create(
        name='Primary Frame',
        definition='Primary frame',
        is_primary=True,
        entity=test_entity
    )
    
    # Creating another primary frame for the same entity should work
    # but the first one should be demoted
    frame2 = Frame.objects.create(
        name='New Primary Frame',
        definition='New primary frame',
        is_primary=True,
        entity=test_entity
    )
    
    # Refresh from database
    frame1.refresh_from_db()
    
    # First frame should no longer be primary
    assert frame1.is_primary is False
    assert frame2.is_primary is True

@pytest.mark.django_db
def test_create_element(test_element):
    """Test that an element can be created with required fields."""
    assert Element.objects.count() == 1
    assert test_element.name == 'Test Element'
    assert test_element.core_type == 'core'
    assert test_element.value == {'key': 'value'}
    assert 'Test Element' in str(test_element)  # Check that the name is in the string representation
    assert 'Core' in str(test_element)  # Check that the core type is in the string representation

@pytest.mark.django_db
def test_element_validation(test_frame):
    """Test element validation, particularly for value field."""
    # Test valid value (dict)
    element = Element(
        fnid=12345,  # fnid must be an integer
        name='Valid Element',
        core_type='core',
        value={'key': 'value'},
        frame=test_frame
    )
    element.full_clean()  # Should not raise
    
    # Test that non-dict values are also valid
    element.value = 'not a dict'
    element.full_clean()  # Should not raise
    
    # Test list value
    element.value = [1, 2, 3]
    element.full_clean()  # Should not raise
    
    # Test number value
    element.value = 42
    element.full_clean()  # Should not raise
    
    # Test boolean value
    element.value = True
    element.full_clean()  # Should not raise
    
    # Test null value
    element.value = None
    element.full_clean()  # Should not raise
    
    # Test invalid core type
    element.core_type = 'invalid_type'
    with pytest.raises(ValidationError):
        element.full_clean()
    
    # Reset core_type to a valid value
    element.core_type = 'core'
    
    # Test creating elements with various value types
    test_values = [
        {'nested': {'key': 'value'}},  # Nested dict
        'plain string',                # String
        42,                            # Integer
        3.14,                          # Float
        True,                          # Boolean
        [1, 2, 3],                     # List
        None                           # Null
    ]
    
    for idx, val in enumerate(test_values):
        element = Element.objects.create(
            fnid=1000 + idx,  # Ensure unique fnid for each test element
            name=f'Test Element {idx}',
            core_type='core',
            definition=f'Test element with value: {val}',
            value=val,
            frame=test_frame
        )
        assert element is not None
        assert element.value == val

# Environment Model Tests

@pytest.fixture
def test_user():
    """Create a test user."""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def test_environment(test_user):
    """Create a test environment."""
    return Environment.objects.create(
        user=test_user,
        name='Test Environment',
        description='A test environment'
    )

@pytest.mark.django_db
def test_environment_creation(test_environment):
    """Test environment creation and string representation."""
    assert Environment.objects.count() == 1
    assert test_environment.name == 'Test Environment'
    assert 'Test Environment' in str(test_environment)
    assert test_environment.created_at is not None
    assert test_environment.updated_at is not None
    assert test_environment.created_at <= timezone.now()

@pytest.mark.django_db
def test_environment_timestamps(test_environment):
    """Test that timestamps are updated correctly."""
    old_updated = test_environment.updated_at
    test_environment.name = 'Updated Name'
    test_environment.save()
    
    assert test_environment.updated_at > old_updated

@pytest.mark.django_db
def test_environment_cache_clearing(test_environment):
    """Test that cache is cleared on save and delete."""
    # Set up test cache
    cache_key = f"env:{test_environment.id}:test_key"
    cache.set(cache_key, 'test_value')
    
    # Save should clear cache
    test_environment.save()
    assert cache.get(cache_key) is None
    
    # Set up again for delete test
    cache.set(cache_key, 'test_value')
    test_environment.delete()
    assert cache.get(cache_key) is None

@pytest.mark.django_db
def test_environment_entity_management(test_environment, test_user):
    """Test entity management methods."""
    # Create entity
    entity = test_environment.create_entity(
        user=test_user,
        name='Test Entity'
    )
    assert entity.id is not None
    assert entity in test_environment.entities.all()
    
    # Get entity
    fetched_entity = test_environment.get_entity(entity.id)
    assert fetched_entity == entity
    
    # Test caching
    assert entity.id in test_environment._entity_cache
    
    # Test deletion
    result = test_environment.delete_entity(entity.id)
    assert result[0] == 1  # One object deleted
    with pytest.raises(Entity.DoesNotExist):
        test_environment.get_entity(entity.id, use_cache=False)

@pytest.mark.django_db
def test_environment_state(test_environment):
    """Test environment state management."""
    state = test_environment.get_state()
    
    assert state['name'] == test_environment.name
    assert state['entity_count'] == 0
    assert 'created_at' in state
    assert 'updated_at' in state
    
    # Test caching
    cache_key = f"env:{test_environment.id}:state"
    assert cache.get(cache_key) is not None
    
    # Test state clearing
    test_environment.save_state()
    assert cache.get(cache_key) is None
