"""
Base Frame Handler

Defines the interface for all frame handlers.
"""
from typing import Dict, Any
from ...models import Frame, Environment


class FrameHandler:
    """
    Base class for frame handlers.
    
    Frame handlers implement frame-specific behavior and state management.
    They are called by the FrameApplicator at various points in the frame lifecycle.
    """
    
    def __init__(self, environment: Environment):
        """
        Initialize the frame handler.
        
        Args:
            environment: The Environment instance for the current world
        """
        self.environment = environment
    
    def on_frame_applied(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Called when a frame is first applied to entities.
        
        Args:
            frame_state: The current state of the frame
            context: Additional context for the frame application
        """
        pass
    
    def on_state_updated(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Called when a frame's state is updated.
        
        Args:
            frame_state: The updated state of the frame
            context: Additional context for the state update
        """
        pass
    
    def on_frame_completed(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Called when a frame is completed.
        
        Args:
            frame_state: The final state of the frame
            context: Additional context for the frame completion
        """
        pass
    
    def validate_role_assignments(self, role_assignments: Dict[str, Any], 
                                frame_state: Dict[str, Any]) -> None:
        """
        Validate role assignments for this frame.
        
        Args:
            role_assignments: Mapping of role names to entity IDs
            frame_state: The current frame state
            
        Raises:
            RoleAssignmentError: If role assignments are invalid
        """
        pass
