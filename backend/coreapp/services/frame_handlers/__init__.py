"""
Frame Handlers Package

This package contains frame handler implementations for different frame types.
Each frame type can have its own handler that defines frame-specific behavior.
"""

# Import all handler classes to make them available when importing from frame_handlers
from .base import FrameHandler  # noqa
from .giving_frame import GivingFrameHandler  # noqa

# This will be populated by the register_handler decorator
HANDLERS = {}

def register_handler(frame_name: str):
    """
    Decorator to register a frame handler class for a specific frame type.
    
    Args:
        frame_name: The name of the frame this handler handles
    """
    def decorator(handler_class):
        HANDLERS[frame_name] = handler_class
        return handler_class
    return decorator
