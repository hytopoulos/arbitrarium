from django.test import TestCase
from django.db import transaction
from django.core.exceptions import ValidationError
from ..models import Environment, Entity, User, Frame, Element
from ..services.frame_applicator import FrameApplicator

class FrameApplicatorTest(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test environment
        self.env = Environment.objects.create(
            user=self.user,
            name='Test Environment',
            description='Test environment for FrameApplicator'
        )
        
        # Create test entities
        self.entity1 = Entity.objects.create(
            user=self.user,
            env=self.env,
            name='Test Entity 1'
        )
        self.entity2 = Entity.objects.create(
            user=self.user,
            env=self.env,
            name='Test Entity 2'
        )
        self.entity3 = Entity.objects.create(
            user=self.user,
            env=self.env,
            name='Test Entity 3'
        )
    
    def test_apply_frame_success(self):
        """Test successful frame application with valid roles."""
        # Arrange
        frame_name = 'Giving'
        role_assignments = {
            'giver': self.entity1.id,
            'recipient': self.entity2.id,
            'theme': self.entity3.id
        }
        
        # Act
        applicator = FrameApplicator(self.env)
        result = applicator.apply_frame(frame_name, role_assignments)
        
        # Assert
        self.assertTrue(result['success'])
        self.assertEqual(result['frame'], frame_name)
        self.assertEqual(result['roles'], role_assignments)
        
        # Verify frame instances were created
        frames = Frame.objects.filter(entity__in=[self.entity1, self.entity2, self.entity3])
        self.assertEqual(frames.count(), 3)
        
        # Verify active frames were updated
        self.entity1.refresh_from_db()
        self.assertIn(frame_name, self.entity1.active_frames)
        self.assertIn('giver', self.entity1.active_frames[frame_name])
    
    def test_apply_frame_missing_required_role(self):
        """Test frame application fails when required roles are missing."""
        # Arrange
        frame_name = 'Giving'
        role_assignments = {
            'giver': self.entity1.id,
            # Missing 'recipient' and 'theme' which are required
        }
        
        # Act
        applicator = FrameApplicator(self.env)
        result = applicator.apply_frame(frame_name, role_assignments)
        
        # Assert
        self.assertFalse(result['success'])
        self.assertIn('error', result)
    
    def test_apply_frame_nonexistent_entity(self):
        """Test frame application fails with non-existent entity."""
        # Arrange
        frame_name = 'Giving'
        role_assignments = {
            'giver': 9999,  # Non-existent entity ID
            'recipient': self.entity2.id,
            'theme': self.entity3.id
        }
        
        # Act
        applicator = FrameApplicator(self.env)
        result = applicator.apply_frame(frame_name, role_assignments)
        
        # Assert
        self.assertFalse(result['success'])
        self.assertIn('Entity 9999 not found', result['error'])
    
    def test_get_applicable_frames(self):
        """Test getting applicable frames for entities."""
        # Act
        applicator = FrameApplicator(self.env)
        entity_ids = [self.entity1.id, self.entity2.id, self.entity3.id]
        frames = applicator.get_applicable_frames(self.env, entity_ids)
        
        # Assert
        self.assertIn('Giving', frames)
        self.assertIn('TransferPossession', frames)
        
        # Verify frame roles
        giving_roles = {r['name']: r['required'] for r in frames['Giving']}
        self.assertTrue(giving_roles['giver'])
        self.assertTrue(giving_roles['recipient'])
        self.assertTrue(giving_roles['theme'])
        self.assertFalse(giving_roles.get('purpose', False))
    
    def test_transaction_rollback_on_error(self):
        """Test that failed frame applications are properly rolled back."""
        # Arrange
        frame_name = 'Giving'
        role_assignments = {
            'giver': self.entity1.id,
            'recipient': 9999,  # Will cause an error
            'theme': self.entity3.id
        }
        
        # Get initial frame count
        initial_frame_count = Frame.objects.count()
        
        # Act
        applicator = FrameApplicator(self.env)
        with self.assertRaises(ValueError):
            with transaction.atomic():
                result = applicator.apply_frame(frame_name, role_assignments)
                if not result['success']:
                    raise ValueError(result['error'])
        
        # Assert no new frames were created
        self.assertEqual(Frame.objects.count(), initial_frame_count)
        
        # Verify entity states were not updated
        self.entity1.refresh_from_db()
        self.assertNotIn(frame_name, self.entity1.active_frames)
    
    def test_apply_frame_missing_core_elements(self):
        """Test frame application fails when core elements are missing."""
        # Arrange - Create frames for both entities
        frame1 = Frame.objects.create(
            entity=self.entity1,
            fnid=12345,
            is_primary=True
        )
        frame2 = Frame.objects.create(
            entity=self.entity2,
            fnid=12345,
            is_primary=True
        )
        
        # Add core elements to both frames
        for frame in [frame1, frame2]:
            Element.objects.create(
                frame=frame,
                name='core_role1',
                core_type=Element.CORE,
                definition='A core role'
            )
            Element.objects.create(
                frame=frame,
                name='core_role2',
                core_type=Element.CORE_UNEXPRESSED,
                definition='Another core role'
            )
            Element.objects.create(
                frame=frame,
                name='peripheral_role',
                core_type=Element.PERIPHERAL,
                definition='A peripheral role'
            )
        
        # Try to apply frame with missing core elements
        role_assignments = {
            'core_role1': self.entity1.id,
            # Missing 'core_role2' which is required
            'peripheral_role': self.entity2.id
        }
        
        # Act
        applicator = FrameApplicator(self.env)
        result = applicator.apply_frame('TestFrame', role_assignments)
        
        # Assert
        self.assertFalse(result['success'])
        self.assertIn('Missing required core element(s)', result['error'])
        self.assertIn('core_role2', result['error'])
    
    def test_apply_frame_success_with_core_elements(self):
        """Test successful frame application with all required core elements."""
        # Arrange - Create frames for both entities
        frame1 = Frame.objects.create(
            entity=self.entity1,
            fnid=12345,
            is_primary=True
        )
        frame2 = Frame.objects.create(
            entity=self.entity2,
            fnid=12345,
            is_primary=True
        )
        
        # Add core elements to both frames
        for frame in [frame1, frame2]:
            Element.objects.create(
                frame=frame,
                name='core_role1',
                core_type=Element.CORE,
                definition='A core role'
            )
            Element.objects.create(
                frame=frame,
                name='core_role2',
                core_type=Element.CORE_UNEXPRESSED,
                definition='Another core role'
            )
        
        # Apply frame with all required core elements
        role_assignments = {
            'core_role1': self.entity1.id,
            'core_role2': self.entity2.id
        }
        
        # Act
        applicator = FrameApplicator(self.env)
        result = applicator.apply_frame('TestFrame', role_assignments)
        
        # Assert
        self.assertTrue(result['success'])
        self.assertEqual(result['frame'], 'TestFrame')
