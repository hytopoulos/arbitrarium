"""
Giving Frame Handler

Implements behavior for the FrameNet Giving frame.
"""
from typing import Dict, Any
from django.core.exceptions import ValidationError
from .base import FrameHandler
from ...models import Entity


class GivingFrameHandler(FrameHandler):
    """
    Handler for the FrameNet Giving frame.
    
    The Giving frame involves a Donor transferring possession of a Theme to a Recipient.
    """
    
    def on_frame_applied(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Called when a Giving frame is first applied.
        
        Args:
            frame_state: The current state of the frame
            context: Additional context for the frame application
        """
        # Get the entities involved in this frame
        donor_id = frame_state['role_assignments'].get('Donor')
        theme_id = frame_state['role_assignments'].get('Theme')
        recipient_id = frame_state['role_assignments'].get('Recipient')
        
        if not all([donor_id, theme_id, recipient_id]):
            raise ValidationError("Giving frame requires Donor, Theme, and Recipient roles")
        
        # Get the entities from the environment
        try:
            donor = self.environment.get_entity(donor_id)
            theme = self.environment.get_entity(theme_id)
            recipient = self.environment.get_entity(recipient_id)
        except Exception as e:
            raise ValidationError(f"Error getting entities: {e}")
        
        # Check if the donor actually has the theme in their inventory
        if theme not in donor.inventory.all():
            raise ValidationError("Donor does not have the theme in their inventory")
        
        # Update the frame state with initial values
        frame_state.update({
            'state': 'transferring',
            'transfer_complete': False,
            'acknowledged': False
        })
        
        # Log the transfer
        frame_state.setdefault('log', []).append({
            'timestamp': str(self.environment.get_current_time()),
            'event': 'transfer_initiated',
            'donor': donor_id,
            'theme': theme_id,
            'recipient': recipient_id
        })
    
    def on_state_updated(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Called when the frame's state is updated.
        
        Args:
            frame_state: The updated state of the frame
            context: Additional context for the state update
        """
        # Check if this is a transfer completion update
        if frame_state.get('state') == 'transferring' and context.get('action') == 'complete_transfer':
            self._complete_transfer(frame_state, context)
    
    def on_frame_completed(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Called when the frame is completed.
        
        Args:
            frame_state: The final state of the frame
            context: Additional context for the frame completion
        """
        # Clean up any resources or perform final actions
        frame_state['state'] = 'completed'
        
        # Log the completion
        frame_state.setdefault('log', []).append({
            'timestamp': str(self.environment.get_current_time()),
            'event': 'transfer_completed',
            'donor': frame_state['role_assignments'].get('Donor'),
            'theme': frame_state['role_assignments'].get('Theme'),
            'recipient': frame_state['role_assignments'].get('Recipient')
        })
    
    def _complete_transfer(self, frame_state: Dict[str, Any], context: Dict[str, Any]) -> None:
        """
        Complete the transfer of the theme from donor to recipient.
        
        Args:
            frame_state: The current frame state
            context: Additional context
        """
        # Get the entities
        donor_id = frame_state['role_assignments']['Donor']
        theme_id = frame_state['role_assignments']['Theme']
        recipient_id = frame_state['role_assignments']['Recipient']
        
        donor = self.environment.get_entity(donor_id)
        theme = self.environment.get_entity(theme_id)
        recipient = self.environment.get_entity(recipient_id)
        
        # Remove the theme from the donor's inventory
        donor.inventory.remove(theme)
        
        # Add the theme to the recipient's inventory
        recipient.inventory.add(theme)
        
        # Update the frame state
        frame_state.update({
            'state': 'completed',
            'transfer_complete': True,
            'transfer_time': str(self.environment.get_current_time())
        })
        
        # Log the transfer completion
        frame_state.setdefault('log', []).append({
            'timestamp': str(self.environment.get_current_time()),
            'event': 'transfer_completed',
            'donor': donor_id,
            'theme': theme_id,
            'recipient': recipient_id
        })
        
        # Save the changes
        self.environment.save()


# Register the handler
from . import register_handler

@register_handler('Giving')
class GivingFrameHandlerWrapper(GivingFrameHandler):
    """Wrapper class to register the Giving frame handler."""
    pass
