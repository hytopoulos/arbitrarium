from typing import Dict, List, Optional, Any
from django.db import transaction
from django.core.cache import cache
from ..models import Entity, Frame, Environment

class FrameApplicator:
    """
    Handles the application of frames to entities within an environment.
    Manages frame validation, role assignment, and state transitions.
    """
    
    def __init__(self, environment: Environment):
        self.environment = environment
    
    @transaction.atomic
    def apply_frame(self, frame_name: str, role_assignments: Dict[str, int]) -> Dict[str, Any]:
        """
        Apply a frame to the specified entities with the given role assignments.
        
        Args:
            frame_name: Name of the frame to apply (e.g., 'Giving')
            role_assignments: Dictionary mapping role names to entity IDs
            
        Returns:
            dict: Result of the frame application including success status and any errors
        """
        try:
            # 1. Validate frame and roles
            self._validate_frame(frame_name)
            self._validate_roles(frame_name, role_assignments)
            
            # 2. Get or create frame instances for each entity
            frame_instances = self._create_frame_instances(frame_name, role_assignments)
            
            # 3. Update entity states
            self._update_entity_states(frame_instances, role_assignments)
            
            # 4. Save all changes
            self.environment.save_state()
            
            return {
                'success': True,
                'frame': frame_name,
                'roles': role_assignments,
                'frame_instances': [f.id for f in frame_instances if f.id is not None]
            }
            
        except Exception as e:
            transaction.set_rollback(True)
            return {
                'success': False,
                'error': str(e),
                'frame': frame_name,
                'roles': role_assignments
            }
    
    def _validate_frame(self, frame_name: str) -> None:
        """Validate that the frame exists and is supported."""
        # TODO: Implement frame validation against FrameNet
        # For now, just check it's not empty
        if not frame_name:
            raise ValueError("Frame name cannot be empty")
    
    def _validate_roles(self, frame_name: str, role_assignments: Dict[str, int]) -> None:
        """Validate that all required roles are provided and entities exist."""
        if not role_assignments:
            raise ValueError("At least one role assignment is required")
        
        # Define required roles for each frame type
        FRAME_REQUIREMENTS = {
            'Giving': {'giver', 'recipient', 'theme'},
            # Add other frames and their requirements here
        }
        
        # Get required roles for this frame (if any)
        required_roles = FRAME_REQUIREMENTS.get(frame_name, set())
        provided_roles = set(role_assignments.keys())
        
        # Check if all required roles are provided
        missing_roles = required_roles - provided_roles
        if missing_roles:
            raise ValueError(
                f"Missing required role(s) for frame '{frame_name}': {', '.join(missing_roles)}"
            )
        
        # Check all entities exist in this environment
        entity_ids = list(role_assignments.values())
        existing_entities = set(
            self.environment.entities.filter(id__in=entity_ids).values_list('id', flat=True)
        )
        
        for role, entity_id in role_assignments.items():
            if entity_id not in existing_entities:
                raise ValueError(f"Entity {entity_id} not found in environment")
        
        # Validate core frame elements
        self._validate_core_elements(frame_name, role_assignments)
    
    def _create_frame_instances(self, frame_name: str, role_assignments: Dict[str, int]) -> List[Frame]:
        """Create or update frame instances for the given frame and roles."""
        frame_instances = []
        
        for role, entity_id in role_assignments.items():
            entity = self.environment.get_entity(entity_id)
            
            # Create or update frame instance
            frame, created = Frame.objects.get_or_create(
                entity=entity,
                name=frame_name,
                defaults={
                    'is_primary': False  # Will be updated if this is the first frame for the entity
                }
            )
            
            # If this is the first frame for the entity, make it primary
            if created and not entity.frames.exists():
                frame.is_primary = True
                frame.save()
            
            frame_instances.append(frame)
        
        return frame_instances
    
    def _validate_core_elements(self, frame_name: str, role_assignments: Dict[str, int]) -> None:
        """Validate that all core frame elements are properly assigned for the given frame."""
        from ..models import Frame, Element
        
        # Get all core elements for this frame from the database
        try:
            # Try to find an existing frame with this name to get its elements
            existing_frame = Frame.objects.filter(name=frame_name).first()
            
            if existing_frame:
                # Get core elements for this frame
                core_elements = Element.objects.filter(
                    frame=existing_frame,
                    core_type__in=[Element.CORE, Element.CORE_UNEXPRESSED]
                ).values_list('name', flat=True)
                
                # Check if all core elements are assigned
                core_element_set = set(core_elements)
                provided_roles = set(role_assignments.keys())
                
                missing_core_elements = core_element_set - provided_roles
                if missing_core_elements:
                    raise ValueError(
                        f"Missing required core element(s) for frame '{frame_name}': {', '.join(missing_core_elements)}"
                    )
                
                # Validate that entities can participate in their assigned roles
                for role, entity_id in role_assignments.items():
                    if role in core_element_set:
                        entity = self.environment.get_entity(entity_id)
                        if not entity.can_participate_in(frame_name, role):
                            raise ValueError(
                                f"Entity {entity_id} cannot participate in role '{role}' for frame '{frame_name}'"
                            )
            else:
                # If no existing frame, we can't validate core elements
                # This might happen for new frames that haven't been populated yet
                pass
        except ValueError:
            # Re-raise ValueError exceptions (like missing core elements) to fail validation
            raise
        except Exception as e:
            # Log the error but don't fail validation if we can't check core elements
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not validate core elements for frame '{frame_name}': {str(e)}")
            # Don't raise the exception to avoid breaking the simulation
    
    def _update_entity_states(self, frame_instances: List[Frame], role_assignments: Dict[str, int]) -> None:
        """Update entity states based on frame application."""
        # Update active frames for each entity
        for frame in frame_instances:
            entity = frame.entity
            
            # Initialize active_frames if it doesn't exist
            if not entity.active_frames:
                entity.active_frames = {}
            
            # Add this frame to the entity's active frames
            role = next((r for r, e_id in role_assignments.items() if e_id == entity.id), None)
            if role:
                if frame.name not in entity.active_frames:
                    entity.active_frames[frame.name] = []
                if role not in entity.active_frames[frame.name]:
                    entity.active_frames[frame.name].append(role)
            
            # Mark entity as dirty for saving
            self.environment._dirty_entities.add(entity.id)
            
            # Update entity in cache
            self.environment._entity_cache[entity.id] = entity
    
    @classmethod
    def get_applicable_frames(cls, environment: Environment, entity_ids: List[int]) -> Dict[str, List[Dict]]:
        """
        Get all frames that can be applied to the given entities.
        
        Args:
            environment: The environment containing the entities
            entity_ids: List of entity IDs to check frames for
            
        Returns:
            dict: Mapping of frame names to their required roles
        """
        # TODO: Implement frame suggestion based on entity types and existing frames
        # For now, return a simple example
        return {
            'Giving': [
                {'name': 'giver', 'required': True},
                {'name': 'recipient', 'required': True},
                {'name': 'theme', 'required': True},
                {'name': 'purpose', 'required': False}
            ],
            'TransferPossession': [
                {'name': 'donor', 'required': True},
                {'name': 'recipient', 'required': True},
                {'name': 'theme', 'required': True}
            ]
        }
