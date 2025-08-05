"""
Pytest configuration and fixtures for coreapp tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from coreapp.models import Environment, Entity, Frame, Element

User = get_user_model()

@pytest.fixture
def api_client():
    """API client fixture for making test requests."""
    return APIClient()


@pytest.fixture
def test_user():
    """Create and return a test user."""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def test_environment(test_user):
    """Create and return a test environment."""
    return Environment.objects.create(
        name='Test Environment',
        user=test_user
    )


@pytest.fixture
def test_entity(test_user, test_environment):
    """Create and return a test entity."""
    return Entity.objects.create(
        name='Test Entity',
        wnid=1,  # Changed from 'n00000001' to integer
        fnid=1,  # Changed from 'fn00000001' to integer
        env=test_environment,
        user=test_user
    )


@pytest.fixture
def test_frame(test_entity):
    """Create and return a test frame."""
    return Frame.objects.create(
        fnid=1,
        definition='A test frame definition',
        is_primary=True,
        entity=test_entity
    )


@pytest.fixture
def test_element(test_frame):
    """Create and return a test element."""
    return Element.objects.create(
        name='Test Element',
        core_type='core',
        definition='A test element definition',
        value={'key': 'value'},
        frame=test_frame
    )
