"""
NLTK wrapper for the ARB project.
This module provides low-level access to NLTK functionality.
"""
import nltk
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class NLTKFrameNetWrapper:
    """
    Low-level wrapper around NLTK's FrameNet interface.
    This class should only be used by the FrameNet service layer.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NLTKFrameNetWrapper, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize the NLTK FrameNet interface."""
        try:
            logger.info("Initializing NLTK FrameNet wrapper...")
            nltk_data_dir = nltk.data.path[0]
            logger.info(f"Using NLTK data directory: {nltk_data_dir}")
            
            try:
                nltk.data.find('corpora/framenet_v17')
                logger.info("FrameNet data found in NLTK data directory")
            except LookupError:
                logger.info("FrameNet data not found. Downloading...")
                nltk.download('framenet_v17')
                logger.info("Successfully downloaded FrameNet data")
                
            from nltk.corpus import framenet as fn
            self.fn = fn
            logger.info("Successfully loaded FrameNet data")
            
        except Exception as e:
            logger.error(f"Error initializing NLTK FrameNet: {str(e)}", exc_info=True)
            raise
    
    def get_all_frames(self) -> List[Dict[str, Any]]:
        """Get all frames from FrameNet."""
        frames = self.fn.frames()
        return [
            {
                'id': frame.ID,
                'name': frame.name,
                'definition': frame.definition,
                'lex_unit_count': len(frame.lexUnit)
            }
            for frame in frames
        ]
    
    def get_frame_by_name(self, frame_name: str) -> Optional[Dict[str, Any]]:
        """Get a frame by its name."""
        try:
            frame = self.fn.frame_by_name(frame_name)
            frame_elements = []
            for fe in frame.FE.values():
                frame_elements.append({
                    'name': fe.name,
                    'core_type': fe.coreType.lower(),  # e.g., 'core', 'peripheral', 'core_ue', 'extra_thematic'
                    'definition': fe.definition if hasattr(fe, 'definition') else ''
                })
                
            return {
                'id': frame.ID,
                'name': frame.name,
                'definition': frame.definition,
                'lex_unit_count': len(frame.lexUnit),
                'frame_elements': frame_elements,
                'lexical_units': list(frame.lexUnit.keys())
            }
        except Exception as e:
            logger.error(f"Error getting frame '{frame_name}': {str(e)}")
            return None
    
    def search_frames(self, query: str) -> List[Dict[str, Any]]:
        """Search for frames matching the query."""
        try:
            results = self.fn.frames(r'(?i).*{}.*'.format(query))
            return [
                {
                    'id': frame.ID,
                    'name': frame.name,
                    'definition': frame.definition
                }
                for frame in results
            ]
        except Exception as e:
            logger.error(f"Error searching frames with query '{query}': {str(e)}")
            return []
            
    def get_frame_by_id(self, frame_id: int) -> Optional[Dict[str, Any]]:
        """Get a frame by its ID.
        
        Args:
            frame_id: The ID of the frame to retrieve
            
        Returns:
            Dictionary containing frame information or None if not found
        """
        try:
            logger.info(f"Searching for frame with ID: {frame_id}")
            
            # NLTK's FrameNet doesn't have a direct method to get by ID,
            # so we need to search through all frames
            frames = list(self.fn.frames())
            logger.info(f"Total frames available: {len(frames)}")
            
            for frame in frames:
                if frame.ID == frame_id:
                    frame_elements = []
                    for fe in frame.FE.values():
                        frame_elements.append({
                            'name': fe.name,
                            'core_type': fe.coreType.lower(),  # e.g., 'core', 'peripheral', 'core_ue', 'extra_thematic'
                            'definition': fe.definition if hasattr(fe, 'definition') else ''
                        })
                        
                    frame_data = {
                        'ID': frame.ID,
                        'name': frame.name,
                        'definition': frame.definition,
                        'lex_unit_count': len(frame.lexUnit),
                        'frame_elements': frame_elements,
                        'lexical_units': list(frame.lexUnit.keys())
                    }
                    logger.info(f"Found frame: {frame_data}")
                    return frame_data
                    
            logger.warning(f"Frame with ID {frame_id} not found in {len(frames)} frames")
            return None
            
        except Exception as e:
            logger.error(f"Error getting frame by ID {frame_id}", exc_info=True)
            return None
