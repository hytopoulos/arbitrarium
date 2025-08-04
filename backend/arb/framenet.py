"""
FrameNet service for the ARB project.
This module provides a clean interface to FrameNet functionality,
abstracting away the NLTK implementation details.
"""
import logging
from typing import List, Dict, Any, Optional

from .nltk_wrapper import NLTKFrameNetWrapper

logger = logging.getLogger(__name__)

class FrameNetService:
    """
    High-level service for FrameNet operations.
    Delegates to the NLTK implementation in the arb/ directory.
    """
    _instance = None
    _wrapper = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FrameNetService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
        
    def _initialize(self):
        """Initialize the FrameNet service with its NLTK wrapper."""
        logger.info("Initializing FrameNet service...")
        if FrameNetService._wrapper is None:
            FrameNetService._wrapper = NLTKFrameNetWrapper()
        logger.info("FrameNet service initialized")
    
    def get_all_frames(self) -> List[Dict[str, Any]]:
        """
        Get all available frames from FrameNet.
        
        Returns:
            List of dictionaries containing frame information
        """
        logger.info("Fetching all frames from FrameNet...")
        return self._wrapper.get_all_frames()
    
    def get_frame_by_name(self, frame_name: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific frame by its name.
        
        Args:
            frame_name: Name of the frame to retrieve
            
        Returns:
            Dictionary containing frame information or None if not found
        """
        logger.info(f"Fetching frame: {frame_name}")
        return self._wrapper.get_frame_by_name(frame_name)
    
    def search_frames(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for frames matching the given query.
        
        Args:
            query: Search term to match against frame names and definitions
            
        Returns:
            List of matching frame dictionaries
        """
        logger.info(f"Searching frames for: {query}")
        return self._wrapper.search_frames(query)
