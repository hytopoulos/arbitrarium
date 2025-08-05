"""
Tests for the Frame and Element views.
"""
import pytest
from django.urls import reverse
from rest_framework import status

from coreapp.models import Frame, Element

# Test data
FRAME_DATA = {
    'name': 'Test Frame',
    'definition': 'A test frame definition',
    'is_primary': True,
    'fnid': 12345,  # Required field for Frame creation
    'elements': [],  # Required field by the serializer
}

ELEMENT_DATA = {
    'name': 'Test Element',
    'core_type': 'core',
    'definition': 'A test element definition',
    'value': {'key': 'value'},
    'fnid': 54321,  # Required field for Element creation
}

@pytest.mark.django_db
class TestFrameViewSet:
    """Tests for the FrameViewSet."""
    
    def test_create_frame(self, authenticated_client, test_entity):
        """Test creating a new frame."""
        url = reverse('frame-list')
        # Ensure entity ID is an integer
        data = {**FRAME_DATA, 'entity': int(test_entity.id)}
        
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED, f"Expected 201, got {response.status_code}: {response.data}"
        assert Frame.objects.count() == 1
        frame = Frame.objects.first()
        assert frame.name == 'Test Frame'
        assert frame.entity_id == test_entity.id
        
    def test_list_frames(self, authenticated_client, test_frame):
        """Test listing frames."""
        url = reverse('frame-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == test_frame.name
        
    def test_retrieve_frame(self, authenticated_client, test_frame):
        """Test retrieving a single frame."""
        url = reverse('frame-detail', args=[test_frame.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == test_frame.name
        
    def test_update_frame(self, authenticated_client, test_frame):
        """Test updating a frame."""
        url = reverse('frame-detail', args=[test_frame.id])
        data = {'name': 'Updated Frame Name'}
        
        response = authenticated_client.patch(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        test_frame.refresh_from_db()
        assert test_frame.name == 'Updated Frame Name'
        
    def test_delete_frame(self, authenticated_client, test_frame):
        """Test deleting a frame."""
        url = reverse('frame-detail', args=[test_frame.id])
        
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Frame.objects.count() == 0
        
    def test_suggest_frames(self, authenticated_client, test_entity, test_environment):
        """Test the frame suggestion endpoint."""
        from unittest.mock import patch, MagicMock
        from coreapp.services.frame_application import FrameMatch
        from coreapp.models import Frame
        
        # Ensure the test entity is associated with the test environment
        test_entity.environment = test_environment
        test_entity.save()
        
        # Create a test frame
        test_frame = Frame.objects.create(
            fnid=12345,
            entity=test_entity
        )
        
        # Create a mock FrameMatch object
        mock_match = FrameMatch(
            frame=test_frame,
            score=1.0,
            role_assignments={'TestRole': test_entity},
            confidence=0.9
        )
        
        # Create a mock environment
        mock_environment = MagicMock()
        mock_environment.id = test_environment.id
        
        # Patch the Environment.objects.get method
        with patch('coreapp.views.frame.Environment.objects.get', return_value=mock_environment) as mock_env_get, \
             patch('coreapp.views.frame.FrameApplicator') as mock_applicator:
            
            # Configure the mock FrameApplicator
            mock_instance = mock_applicator.return_value
            mock_instance.find_applicable_frames.return_value = [mock_match]
            
            # Make the request
            url = f"{reverse('frame-suggest')}?entity_id={test_entity.id}"
            response = authenticated_client.get(url)
            
            # Print response data for debugging
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
            
            # Verify the response
            assert response.status_code == status.HTTP_200_OK, \
                f"Expected status code 200, got {response.status_code}. Response: {response.data}"
            assert len(response.data) == 1, \
                f"Expected 1 frame suggestion, got {len(response.data)}. Response: {response.data}"
            assert response.data[0]['name'] == 'Test Frame', \
                f"Unexpected frame name. Expected 'Test Frame', got {response.data[0].get('name')}"
        
    def test_bulk_create_frames(self, authenticated_client, test_entity):
        """Test bulk creating frames."""
        url = reverse('frame-bulk-create')
        data = [
            {**FRAME_DATA, 'entity': test_entity.id, 'name': 'Frame 1', 'elements': []},
            {**FRAME_DATA, 'entity': test_entity.id, 'name': 'Frame 2', 'elements': []},
        ]
        
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        assert Frame.objects.count() == 2


@pytest.mark.django_db
class TestElementViewSet:
    """Tests for the ElementViewSet."""
    
    def test_create_element(self, authenticated_client, test_frame):
        """Test creating a new element."""
        url = reverse('element-list')
        data = {**ELEMENT_DATA, 'frame': test_frame.id}
        
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Element.objects.count() == 1
        assert Element.objects.get().name == 'Test Element'
        
    def test_list_elements(self, authenticated_client, test_element):
        """Test listing elements."""
        url = reverse('element-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == test_element.name
        
    def test_retrieve_element(self, authenticated_client, test_element):
        """Test retrieving a single element."""
        url = reverse('element-detail', args=[test_element.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == test_element.name
        
    def test_update_element(self, authenticated_client, test_element):
        """Test updating an element."""
        url = reverse('element-detail', args=[test_element.id])
        data = {'name': 'Updated Element Name'}
        
        response = authenticated_client.patch(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        test_element.refresh_from_db()
        assert test_element.name == 'Updated Element Name'
        
    def test_delete_element(self, authenticated_client, test_element):
        """Test deleting an element."""
        url = reverse('element-detail', args=[test_element.id])
        
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Element.objects.count() == 0
