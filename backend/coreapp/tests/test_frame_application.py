"""
Tests for the FrameApplicator service.
"""
import pytest
from unittest.mock import MagicMock, patch
from django.core.cache import cache
from coreapp.models import Entity, Environment, Frame, Element
from coreapp.services.frame_application import FrameApplicator, FrameMatch


@pytest.mark.django_db
class TestFrameApplicator:
    """Tests for the FrameApplicator service class."""
    
    @pytest.fixture(autouse=True)
    def setup(self, test_environment, test_entity):
        """Set up test data."""
        self.environment = test_environment
        self.entity = test_entity
        self.applicator = FrameApplicator(environment=self.environment)
        
        # Create a test frame
        self.test_frame = Frame.objects.create(
            entity=self.entity,
            fnid=12345,
            name='Test Frame',
            definition='A test frame',
            is_primary=True
        )
        
        # Create test elements for the frame
        self.test_elements = [
            Element.objects.create(
                frame=self.test_frame,
                fnid=1,
                name='Test Element 1',
                core_type='core',
                definition='A test element',
                value={'key': 'value'}
            ),
            Element.objects.create(
                frame=self.test_frame,
                fnid=2,
                name='Test Element 2',
                core_type='peripheral',
                definition='Another test element',
                value=42
            )
        ]
    
    def test_find_applicable_frames(self, test_entity):
        """Test finding applicable frames for entities."""
        # Create a test entity to match against
        other_entity = Entity.objects.create(
            user=test_entity.user,
            env=self.environment,
            name='Test Entity 2',
            wnid=54321,
            fnid=67890
        )
        
        # Mock the _get_potential_frames method to return our test frame
        with patch.object(self.applicator, '_get_potential_frames', 
                         return_value=[self.test_frame]) as mock_get_frames:
            # Mock the _score_frame method to return a match
            with patch.object(self.applicator, '_score_frame', 
                            return_value=FrameMatch(
                                frame=self.test_frame,
                                score=0.9,
                                role_assignments={'role1': test_entity, 'role2': other_entity}
                            )) as mock_score_frame:
                
                # Call the method
                matches = self.applicator.find_applicable_frames(
                    entities=[test_entity, other_entity]
                )
                
                # Verify the results
                assert len(matches) == 1
                match = matches[0]
                assert match.frame == self.test_frame
                assert match.score == 0.9
                assert len(match.role_assignments) == 2
                assert match.role_assignments['role1'] == test_entity
                assert match.role_assignments['role2'] == other_entity
                
                # Verify the mocks were called
                mock_get_frames.assert_called_once()
                mock_score_frame.assert_called_once_with(
                    self.test_frame, 
                    [test_entity, other_entity], 
                    {}
                )
    
    def test_apply_frame(self, test_entity):
        """Test applying a frame to entities."""
        # Create a test entity to use as a role
        role_entity = Entity.objects.create(
            user=test_entity.user,
            env=self.environment,
            name='Role Entity',
            wnid=98765,
            fnid=43210
        )
        
        # Define role assignments - must match the frame's core elements exactly
        # The test frame has one core element: 'Test Element 1'
        role_assignments = {
            'Test Element 1': test_entity  # This is the only valid role for this frame
        }
        
        # Mock the database transaction and other methods as needed
        with patch('django.db.transaction.atomic'):
            # Call the method
            result = self.applicator.apply_frame(
                frame=self.test_frame,
                role_assignments=role_assignments,
                context={'test': 'context'}
            )
            
            # Verify the result contains the expected structure
            # The actual return value is the frame state dictionary
            assert isinstance(result, dict)
            assert 'frame_id' in result
            assert 'frame_name' in result
            assert 'role_assignments' in result
            assert 'state' in result
            assert 'created_at' in result
            assert 'context' in result
            assert '_version' in result
            
            # Verify the role assignments were set correctly
            assert result['role_assignments'] == {'Test Element 1': test_entity.id}
    
    def test_get_potential_frames(self, test_entity):
        """Test getting potential frames for entities."""
        # Call the method
        frames = self.applicator._get_potential_frames(
            entities=[test_entity],
            context={}
        )
        
        # The method returns a QuerySet, so we'll check its type
        from django.db.models.query import QuerySet
        assert isinstance(frames, QuerySet)
        
        # Optionally, you could also check if the QuerySet is empty
        # since we don't have any frames in the test database
        assert len(frames) == 0
    
    def test_score_frame(self, test_entity):
        """Test scoring a frame for entities."""
        # Call the method
        match = self.applicator._score_frame(
            frame=self.test_frame,
            entities=[test_entity],
            context={}
        )
        
        # The method returns a FrameMatch object
        from coreapp.services.frame_application import FrameMatch
        assert isinstance(match, FrameMatch)
        
        # Verify the match has the expected attributes
        assert match.frame == self.test_frame
        assert isinstance(match.score, float)
        assert isinstance(match.role_assignments, dict)


@pytest.mark.django_db
def test_frame_match_initialization():
    """Test initialization of FrameMatch dataclass."""
    # Create a mock frame and entities
    frame = MagicMock()
    role_assignments = {'role1': MagicMock(), 'role2': MagicMock()}
    
    # Create a FrameMatch instance
    match = FrameMatch(
        frame=frame,
        score=0.8,
        role_assignments=role_assignments,
        confidence=0.9,
        metadata={'test': 'data'}
    )
    
    # Verify the attributes
    assert match.frame == frame
    assert match.score == 0.8
    assert match.role_assignments == role_assignments
    assert match.confidence == 0.9
    assert match.metadata == {'test': 'data'}
