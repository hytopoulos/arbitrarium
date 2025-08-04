"""
Frame Application Service

Handles the application of frames to entities in the world, including frame matching,
role assignment, and frame state management.
"""
import logging
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Dict, List, Optional, Set, Any, Type, TypeVar, Generic
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from coreapp.models import Entity, Frame, Element, Environment

logger = logging.getLogger(__name__)

# Type variable for frame states
FrameState = Dict[str, Any]


class FrameApplicationError(Exception):
    """Base exception for frame application errors."""
    pass


class RoleAssignmentError(FrameApplicationError):
    """Raised when role assignment fails."""
    pass


class FrameStateError(FrameApplicationError):
    """Raised when there's an error with frame state management."""
    pass


@dataclass
class FrameMatch:
    """Represents a potential frame match with its score and role assignments."""
    frame: Frame
    score: float
    role_assignments: Dict[str, Entity]
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class FrameApplicator:
    """
    Handles the application of frames to entities in the world.
    
    This service is responsible for finding applicable frames for entities,
    assigning roles, and managing frame state transitions.
    """
    
    def __init__(self, environment: Environment):
        """
        Initialize the FrameApplicator with an environment.
        
        Args:
            environment: The environment to operate on
        """
        self.environment = environment
        self._frame_handlers = {}  # frame_name -> handler_class
        
    def find_applicable_frames(self, entities: List[Entity], 
                             context: Dict[str, Any] = None) -> List[FrameMatch]:
        """
        Find frames that could apply to the given entities.
        
        Args:
            entities: List of entities to find frames for
            context: Additional context for frame matching
            
        Returns:
            List of potential frame matches with scores and role assignments
        """
        if context is None:
            context = {}
            
        matches = []
        
        # Get all frames that could potentially match
        frames = self._get_potential_frames(entities, context)
        
        # Score each frame
        for frame in frames:
            try:
                match = self._score_frame(frame, entities, context)
                if match and match.score > 0:
                    matches.append(match)
            except Exception as e:
                logger.warning(f"Error scoring frame {frame.name}: {e}")
                continue
        
        # Sort by score (highest first)
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches
    
    def apply_frame(self, frame: Frame, role_assignments: Dict[str, Entity], 
                   context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Apply a frame to entities with the given role assignments.
        
        Args:
            frame: The frame to apply
            role_assignments: Mapping of role names to entities
            context: Additional context for frame application
            
        Returns:
            The new frame state
            
        Raises:
            RoleAssignmentError: If role assignments are invalid
            FrameStateError: If the frame cannot be applied
        """
        if context is None:
            context = {}
            
        # Validate role assignments
        self._validate_role_assignments(frame, role_assignments)
        
        # Create initial frame state
        frame_state = self._create_initial_state(frame, role_assignments, context)
        
        # Update entity states
        self._update_entity_states(frame, role_assignments, frame_state)
        
        # Call frame handler if available
        self._invoke_frame_handler(frame, 'on_frame_applied', frame_state, context)
        
        return frame_state
    
    def update_frame_state(self, frame_state: Dict[str, Any], 
                         updates: Dict[str, Any] = None,
                         context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Update the state of an active frame.
        
        Args:
            frame_state: The current frame state
            updates: Dictionary of updates to apply
            context: Additional context for the update
            
        Returns:
            The updated frame state
        """
        if updates is None:
            updates = {}
        if context is None:
            context = {}
            
        # Apply updates
        frame_state.update(updates)
        frame_state['_version'] = frame_state.get('_version', 0) + 1
        
        # Call frame handler if available
        frame = Frame.objects.get(id=frame_state['frame_id'])
        self._invoke_frame_handler(frame, 'on_state_updated', frame_state, context)
        
        return frame_state
    
    def _get_potential_frames(self, entities: List[Entity], 
                            context: Dict[str, Any]) -> List[Frame]:
        """Get a list of frames that could potentially match the given entities."""
        # This is a simplified implementation - in a real system, you'd want to:
        # 1. Filter frames based on entity types and relationships
        # 2. Consider the current world state
        # 3. Use a more sophisticated matching algorithm
        
        # For now, just get all frames that have elements matching the entity types
        entity_types = {e.__class__.__name__ for e in entities}
        
        return Frame.objects.filter(
            elements__core_type=Element.CORE,
            elements__name__in=entity_types
        ).distinct()
    
    def _score_frame(self, frame: Frame, entities: List[Entity], 
                    context: Dict[str, Any]) -> Optional[FrameMatch]:
        """Score how well a frame matches the given entities."""
        # This is a simplified scoring algorithm
        # In a real system, you'd want to consider:
        # - Required vs optional roles
        # - Type compatibility
        # - Preconditions
        # - Contextual information
        
        role_assignments = {}
        score = 0.0
        
        # Get core elements for this frame
        core_elements = frame.elements.filter(core_type=Element.CORE)
        
        # Try to assign entities to roles
        for element in core_elements:
            for entity in entities:
                if self._can_play_role(entity, element, context):
                    role_assignments[element.name] = entity
                    score += 1.0
                    break
        
        # Calculate confidence (simple ratio of filled roles to total core roles)
        confidence = score / core_elements.count() if core_elements.count() > 0 else 0.0
        
        # Only return matches that have at least one role filled
        if score > 0:
            return FrameMatch(
                frame=frame,
                score=score,
                role_assignments=role_assignments,
                confidence=confidence
            )
        return None
    
    def _can_play_role(self, entity: Entity, element: Element, 
                       context: Dict[str, Any]) -> bool:
        """Check if an entity can play a specific role in a frame."""
        # Check if the entity can participate in this frame role
        if not entity.can_participate_in(element.frame.name, element.name):
            return False
            
        # Additional checks could include:
        # - Type compatibility
        # - Preconditions
        # - Current state of the entity
        # - Contextual information
        
        return True
    
    def _validate_role_assignments(self, frame: Frame, 
                                 role_assignments: Dict[str, Entity]) -> None:
        """Validate that role assignments are valid for the given frame."""
        required_roles = set(
            frame.elements
            .filter(core_type=Element.CORE)
            .values_list('name', flat=True)
        )
        
        # Check for missing required roles
        missing_roles = required_roles - set(role_assignments.keys())
        if missing_roles:
            raise RoleAssignmentError(
                f"Missing required roles: {', '.join(missing_roles)}"
            )
        
        # Check for invalid roles
        valid_roles = set(frame.elements.values_list('name', flat=True))
        invalid_roles = set(role_assignments.keys()) - valid_roles
        if invalid_roles:
            raise RoleAssignmentError(
                f"Invalid roles: {', '.join(invalid_roles)}"
            )
    
    def _create_initial_state(self, frame: Frame, 
                            role_assignments: Dict[str, Entity],
                            context: Dict[str, Any]) -> Dict[str, Any]:
        """Create the initial state for a frame."""
        return {
            'frame_id': frame.id,
            'frame_name': frame.name,
            'role_assignments': {
                role: entity.id 
                for role, entity in role_assignments.items()
            },
            'state': 'active',
            'created_at': str(timezone.now()),
            'context': context.copy(),
            '_version': 1,
        }
    
    def _update_entity_states(self, frame: Frame, 
                            role_assignments: Dict[str, Entity],
                            frame_state: Dict[str, Any]) -> None:
        """Update the state of entities involved in the frame."""
        for role, entity in role_assignments.items():
            # Add frame to entity's active frames
            entity.active_frames[frame.name] = {
                'frame_id': frame.id,
                'role': role,
                'state': 'active',
                'since': str(timezone.now())
            }
            entity.save()
    
    def _invoke_frame_handler(self, frame: Frame, method_name: str, 
                            frame_state: Dict[str, Any], 
                            context: Dict[str, Any]) -> None:
        """Invoke a method on the frame's handler if one exists."""
        handler_class = self._frame_handlers.get(frame.name)
        if handler_class:
            try:
                handler = handler_class(self.environment)
                if hasattr(handler, method_name):
                    getattr(handler, method_name)(frame_state, context)
            except Exception as e:
                logger.error(f"Error in frame handler {frame.name}.{method_name}: {e}")
                raise FrameStateError(
                    f"Error in frame handler {frame.name}.{method_name}: {e}"
                ) from e
