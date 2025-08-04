"""
Tests for the Frame and Element views.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from coreapp.models import Frame, Element, Entity, Environment, User
from coreapp.serializers import FrameSerializer, ElementSerializer


@pytest.mark.django_db
class TestFrameViewSet:
    """Test cases for the FrameViewSet."""

    @pytest.fixture
    def api_client(self):
        from rest_framework.test import APIClient
        return APIClient()

    @pytest.fixture
    def test_user(self):
        return User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )

    @pytest.fixture
    def test_environment(self, test_user):
        return Environment.objects.create(
            name='Test Environment',
            user=test_user
        )

    @pytest.fixture
    def test_entity(self, test_user, test_environment):
        return Entity.objects.create(
            name='Test Entity',
            user=test_user,
            env=test_environment,
            wnid=1,
            fnid=1
        )

    @pytest.fixture
    def test_frame(self, test_entity):
        return Frame.objects.create(
            entity=test_entity,
            name='Test Frame',
            definition='A test frame',
            is_primary=True,
            fnid=123
        )

    @pytest.fixture
    def test_element(self, test_frame):
        return Element.objects.create(
            frame=test_frame,
            name='Test Element',
            core_type='core',
            definition='A test element',
            value={'key': 'value'},
            fnid=456
        )

    def test_list_frames(self, api_client, test_frame, test_entity):
        """Test listing frames."""
        url = reverse('frame-list')
        response = api_client.get(f"{url}?entity={test_entity.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == test_frame.name

    def test_retrieve_frame(self, api_client, test_frame):
        """Test retrieving a single frame."""
        url = reverse('frame-detail', args=[test_frame.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == test_frame.name

    def test_create_frame(self, api_client, test_entity, test_user):
        """Test creating a new frame."""
        api_client.force_authenticate(user=test_user)
        url = reverse('frame-list')
        data = {
            'entity': test_entity.id,
            'name': 'New Frame',
            'definition': 'A new test frame',
            'is_primary': True,
            'fnid': 789,
            'elements': []
        }
        response = api_client.post(url, data, format='json')
        print(f"Response status: {response.status_code}")  # Debug log
        print(f"Response data: {response.data}")  # Debug log
        assert response.status_code == status.HTTP_201_CREATED, f"Expected 201, got {response.status_code}. Response: {response.data}"
        assert Frame.objects.count() == 1, f"Expected 1 frame, found {Frame.objects.count()}"
        assert Frame.objects.get().name == 'New Frame'

    def test_set_primary(self, api_client, test_frame, test_entity, test_user):
        """Test setting a frame as primary."""
        from django.urls import get_resolver
        from pprint import pprint
        from django.urls.resolvers import URLPattern, URLResolver
        
        def print_urls(url_patterns, prefix=''):
            for p in url_patterns:
                if isinstance(p, URLPattern):
                    print(f"{prefix}{p.pattern} -> {getattr(p, 'name', '')}")
                elif isinstance(p, URLResolver):
                    print(f"{prefix}{p.pattern} -> {getattr(p, 'app_name', '')}")
                    if hasattr(p, 'url_patterns'):
                        print_urls(p.url_patterns, prefix + '  ')
        
        # Debug: Print all available URL patterns
        print("\nAvailable URL patterns:")
        resolver = get_resolver()
        print_urls(resolver.url_patterns)
        
        # Also try to get the URL pattern for the frame viewset
        try:
            from django.urls import reverse
            print("\nTrying to reverse 'frame-set-primary'...")
            url = reverse('frame-set-primary', kwargs={'pk': 1})
            print(f"Success! URL: {url}")
        except Exception as e:
            print(f"Error reversing 'frame-set-primary': {e}")
        
        api_client.force_authenticate(user=test_user)

        # Create a second frame
        frame2 = Frame.objects.create(
            entity=test_entity,
            name='Second Frame',
            definition='Another test frame',
            is_primary=False,
            fnid=456
        )
        
        # The URL name for the set_primary action should be 'frame-set-primary' (basename + url_name)
        # But we can also construct the URL directly to avoid any reverse() issues
        url = f'/api/frame/{frame2.id}/set-primary/'
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK, f"Expected 200, got {response.status_code}. Response: {response.data}"
        assert response.data['status'] == 'frame set as primary'
        
        # Refresh both frames from the database
        test_frame.refresh_from_db()
        frame2.refresh_from_db()
        
        # Check that the second frame is now primary and the first one is not
        assert not test_frame.is_primary, "Original frame should no longer be primary"
        assert frame2.is_primary, "New frame should be set as primary"

    def test_search_frames(self, api_client, test_frame, test_user):
        """Test searching for frames."""
        api_client.force_authenticate(user=test_user)
        url = f"{reverse('frame-search')}?q=test"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == test_frame.name

    def test_list_elements(self, api_client, test_frame, test_element, test_user):
        """Test listing elements for a frame."""
        api_client.force_authenticate(user=test_user)
        url = reverse('frame-elements', args=[test_frame.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == test_element.name




@pytest.mark.django_db
class TestElementViewSet:
    """Test cases for the ElementViewSet."""

    @pytest.fixture
    def api_client(self):
        from rest_framework.test import APIClient
        return APIClient()

    @pytest.fixture
    def test_user(self):
        return User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )

    @pytest.fixture
    def test_environment(self, test_user):
        return Environment.objects.create(
            name='Test Environment',
            user=test_user
        )

    @pytest.fixture
    def test_entity(self, test_user, test_environment):
        return Entity.objects.create(
            name='Test Entity',
            user=test_user,
            env=test_environment,
            wnid=1,
            fnid=1
        )

    @pytest.fixture
    def test_frame(self, test_entity):
        return Frame.objects.create(
            entity=test_entity,
            name='Test Frame',
            definition='A test frame',
            is_primary=True,
            fnid=123
        )

    @pytest.fixture
    def test_element(self, test_frame):
        return Element.objects.create(
            frame=test_frame,
            name='Test Element',
            core_type='core',
            definition='A test element',
            value={'key': 'value'},
            fnid=456
        )

    def test_list_elements(self, api_client, test_element, test_user):
        """Test listing elements."""
        api_client.force_authenticate(user=test_user)
        url = reverse('element-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == test_element.name

    def test_retrieve_element(self, api_client, test_element, test_user):
        """Test retrieving a single element."""
        api_client.force_authenticate(user=test_user)
        url = reverse('element-detail', args=[test_element.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == test_element.name

    def test_create_element(self, api_client, test_frame, test_user):
        """Test creating a new element."""
        api_client.force_authenticate(user=test_user)
        url = reverse('element-list')
        data = {
            'frame': test_frame.id,
            'name': 'New Element',
            'core_type': 'core',
            'definition': 'A new test element',
            'value': {'new_key': 'new_value'},
            'fnid': 789
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Element.objects.count() == 1
        assert Element.objects.get().name == 'New Element'
