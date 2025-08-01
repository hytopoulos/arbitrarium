"""Tests for the Frame and Element models."""
import pytest
from django.core.exceptions import ValidationError
from coreapp.models import Frame, Element

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
    # Valid JSON value
    element = Element.objects.create(
        name='Valid Element',
        core_type='core',
        definition='A valid element',
        value={'nested': {'key': 'value'}},
        frame=test_frame
    )
    assert element is not None
    
    # Test that non-dict values are stored as-is
    element = Element.objects.create(
        name='String Value',
        core_type='core',
        definition='Element with string value',
        value='plain string',
        frame=test_frame
    )
    assert element.value == 'plain string'
