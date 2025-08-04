"""
Tests for the FrameSuggestionService.
"""
from typing import List, cast
from unittest.mock import patch, MagicMock
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model

from coreapp.models import Frame as FrameModel, Element, Environment, Entity
from coreapp.services.frame_suggestion import FrameSuggestionService
from arb.interfaces.framenet_service import Frame as FrameInterface


class FrameSuggestionServiceTest(TestCase):
    """Test cases for FrameSuggestionService."""
    
    def setUp(self):
        """Set up test data."""
        # Create a test user
        User = get_user_model()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create environment with the test user
        self.env = Environment.objects.create(
            name="Test Environment",
            user=self.user
        )
        
        # Create test entity
        self.entity = Entity.objects.create(
            name="Test Entity",
            user=self.user,
            env=self.env
        )
        
        # Create test frame
        self.frame = FrameModel.objects.create(
            entity=self.entity,
            name="Giving",
            definition="A person gives something to someone"
        )
        
        # Add core elements
        self.donor = Element.objects.create(
            frame=self.frame,
            name="Donor",
            fnid=1,  # Using numeric ID for Person
            core_type=Element.CORE
        )
        self.theme = Element.objects.create(
            frame=self.frame,
            name="Theme",
            fnid=2,  # Using numeric ID for Item
            core_type=Element.CORE
        )
        self.recipient = Element.objects.create(
            frame=self.frame,
            name="Recipient",
            fnid=1,  # Using numeric ID for Person
            core_type=Element.CORE
        )
        
        # Add a non-core element
        self.purpose = Element.objects.create(
            frame=self.frame,
            name="Purpose",
            fnid=3,  # Using numeric ID for Reason
            core_type=Element.PERIPHERAL
        )
    
    @patch('coreapp.services.frame_suggestion.NLTKFrameNetService')
    def _get_potential_frames(self, framenet_ids: List[int], environment_id: int = None) -> List[FrameInterface]:
        """Get potential frames that might match the given FrameNet IDs."""
        # Start with all frames
        query = FrameModel.objects.all()
        
        # If environment_id is provided, filter frames by entities in that environment
        if environment_id is not None:
            query = query.filter(entity__env_id=environment_id)
            
        # Get frames that have elements matching any of the FrameNet IDs
        frames = list(query.prefetch_related('elements').filter(
            elements__fnid__in=framenet_ids
        ).distinct())
        
        # Cast to FrameInterface to match the expected return type
        return cast(List[FrameInterface], frames)
