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
        data = {**FRAME_DATA, 'entity': test_entity.id}
        
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert Frame.objects.count() == 1
        assert Frame.objects.get().name == 'Test Frame'
        
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
        
    def test_suggest_frames(self, authenticated_client, test_entity, monkeypatch):
        """Test the frame suggestion endpoint."""
        # Mock the FrameSuggestor to return test data
        mock_suggestions = [{
            'fnid': 'fn123',
            'name': 'Suggested Frame',
            'definition': 'A suggested frame',
            'score': 0.9,
            'match_type': 'direct',
            'lex_unit': 'test.lex'
        }]
        
        # Create a mock function to replace suggest_frames
        def mock_suggest_frames(*args, **kwargs):
            return mock_suggestions
            
        # Apply the monkeypatch to replace suggest_frames with our mock
        monkeypatch.setattr(
            'coreapp.services.frame_suggestor.FrameSuggestor.suggest_frames',
            mock_suggest_frames
        )
        
        url = f"{reverse('frame-suggest')}?entity_id={test_entity.id}"
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == 'Suggested Frame'
        
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
