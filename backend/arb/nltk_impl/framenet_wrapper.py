"""
NLTK FrameNet Service Implementation

This module provides a concrete implementation of the IFrameNetService interface
using NLTK's FrameNet interface.
"""
import os
import logging
import nltk
from nltk.corpus import framenet as fn
from typing import List, Optional, Dict, Any, Set, ClassVar

from ..interfaces.framenet_service import (
    IFrameNetService, Frame, FrameElement, LexicalUnit, FrameNetError
)

logger = logging.getLogger(__name__)

# Required NLTK data packages
# Note: These must match what's installed in the Dockerfile
REQUIRED_NLTK_DATA = [
    'framenet_v17'  # Core FrameNet data
]

class NLTKFrameNetService(IFrameNetService):
    """
    NLTK-based implementation of the FrameNet service interface.
    """
    _initialized: ClassVar[bool] = False
    _nltk_data_path: ClassVar[Optional[str]] = None
    
    def __init__(self, nltk_data_path: str = None):
        """
        Initialize the NLTK FrameNet service.
        
        Args:
            nltk_data_path: Optional custom path to NLTK data directory
        """
        self._nltk_data_path = nltk_data_path or self._nltk_data_path
        self._ensure_initialized()
    
    @classmethod
    def set_nltk_data_path(cls, path: str) -> None:
        """Set the NLTK data path for all instances."""
        cls._nltk_data_path = path
        if path and os.path.isdir(path):
            os.environ['NLTK_DATA'] = path
            nltk.data.path.append(path)
    
    @classmethod
    def _ensure_initialized(cls) -> None:
        """Ensure NLTK data is downloaded and available."""
        if cls._initialized:
            return
            
        try:
            # Set NLTK data path if configured
            if cls._nltk_data_path:
                os.environ['NLTK_DATA'] = cls._nltk_data_path
                nltk.data.path.append(cls._nltk_data_path)
            
            # Verify FrameNet is available
            if not hasattr(fn, 'frames'):
                error_msg = (
                    "FrameNet data not found. Please ensure NLTK FrameNet data is downloaded.\n"
                    "You can download it using the management command:\n"
                    "    python manage.py init_nltk"
                )
                logger.error(error_msg)
                raise FrameNetError(error_msg)
                
            cls._initialized = True
            logger.info("NLTK FrameNet service initialized successfully")
            
        except Exception as e:
            error_msg = f"Failed to initialize FrameNet: {str(e)}"
            logger.error(error_msg)
            raise FrameNetError(error_msg) from e
    
    def is_available(self) -> bool:
        """Check if the FrameNet service is available and data is accessible."""
        try:
            return hasattr(fn, 'frames') and len(fn.frames()) > 0
        except Exception:
            return False
    
    def _convert_frame_element(self, fe_data: Dict[str, Any]) -> FrameElement:
        """Convert NLTK frame element data to our FrameElement DTO."""
        return FrameElement(
            id=fe_data.get('ID'),
            name=fe_data.get('name', ''),
            core_type=fe_data.get('coreType', ''),
            definition=fe_data.get('definition', '')
        )
    
    def _convert_lexical_unit(self, lu_data: Dict[str, Any]) -> LexicalUnit:
        """Convert NLTK lexical unit data to our LexicalUnit DTO."""
        return LexicalUnit(
            id=lu_data.get('ID'),
            name=lu_data.get('name', ''),
            pos=lu_data.get('POS', ''),
            definition=lu_data.get('definition', '')
        )
    
    def _convert_frame(self, frame_data: Dict[str, Any]) -> Frame:
        """Convert NLTK frame data to our Frame DTO."""
        frame = Frame(
            id=frame_data.get('ID'),
            name=frame_data.get('name', ''),
            definition=frame_data.get('definition', '')
        )
        
        # Add frame elements
        frame.elements = [
            self._convert_frame_element(fe) 
            for fe in frame_data.get('FE', {}).values()
        ]
        
        # Add lexical units
        frame.lexical_units = [
            self._convert_lexical_unit(lu)
            for lu in frame_data.get('lexUnit', {}).values()
        ]
        
        # Add semantic types
        frame.sem_types = frame_data.get('semTypes', [])
        
        return frame
    
    def get_frame(self, frame_id: int) -> Optional[Frame]:
        """
        Get a frame by its ID.
        
        Args:
            frame_id: The ID of the frame to retrieve
            
        Returns:
            The Frame object, or None if not found
        """
        try:
            frame_data = fn.frame(frame_id)
            return self._convert_frame(frame_data)
        except Exception as e:
            if "Frame with id" in str(e) and "does not exist" in str(e):
                return None
            raise FrameNetError(f"Error getting frame {frame_id}: {str(e)}")
    
    def get_frame_by_name(self, name: str) -> Optional[Frame]:
        """
        Get a frame by its name.
        
        Args:
            name: The name of the frame to retrieve (case-insensitive)
            
        Returns:
            The Frame object, or None if not found
        """
        try:
            frames = fn.frames(name.lower())
            if frames:
                return self._convert_frame(frames[0])
            return None
        except Exception as e:
            if "Frame not found" in str(e):
                return None
            raise FrameNetError(f"Error getting frame '{name}': {str(e)}")
    
    def get_frames_by_lemma(self, lemma: str, pos: str = None) -> List[Frame]:
        """
        Get all frames associated with a given lemma.
        
        Args:
            lemma: The lemma to search for
            pos: Optional part of speech filter
            
        Returns:
            List of matching Frame objects
        """
        try:
            # Get all lexical units that match the lemma
            lus = fn.lus(r'\b' + lemma.lower() + r'\..')
            
            # Filter by POS if specified
            if pos:
                lus = [lu for lu in lus if lu.get('POS', '').lower() == pos.lower()]
            
            # Get unique frames
            frame_ids = {lu.frame.get('ID') for lu in lus if lu.frame}
            
            # Convert to Frame objects
            return [self.get_frame(fid) for fid in frame_ids if fid]
            
        except Exception as e:
            raise FrameNetError(f"Error getting frames for lemma '{lemma}': {str(e)}")
    
    def is_subtype(self, frame_id: int, potential_parent_id: int) -> bool:
        """
        Check if a frame is a subtype of another frame.
        
        Args:
            frame_id: The ID of the frame to check
            potential_parent_id: The ID of the potential parent frame
            
        Returns:
            bool: True if frame_id is a subtype of potential_parent_id, False otherwise
        """
        try:
            logger.debug(f"Checking if frame {frame_id} is a subtype of {potential_parent_id}")
            
            # If the IDs are the same, it's not a subtype (it's the same frame)
            if frame_id == potential_parent_id:
                logger.debug(f"Frame {frame_id} is the same as potential parent {potential_parent_id}, returning False")
                return False
                
            # Get the frame data
            try:
                frame_data = fn.frame(frame_id)
                logger.debug(f"Retrieved frame data for {frame_id}: {frame_data.name if hasattr(frame_data, 'name') else 'No name'}")
            except Exception as e:
                logger.warning(f"Error getting frame data for ID {frame_id}: {str(e)}")
                return False
            
            # Check if frame_relations exists and is iterable
            if not hasattr(frame_data, 'frame_relations') or not frame_data.frame_relations:
                logger.debug(f"No frame_relations found for frame {frame_id}")
                return False
                
            logger.debug(f"Frame {frame_id} has {len(frame_data.frame_relations)} relations")
            
            # Check if the potential parent is in the inheritance chain
            for relation in frame_data.frame_relations:
                rel_type = getattr(relation, 'type', None)
                rel_type_name = getattr(rel_type, 'name', 'unknown').lower() if rel_type else 'unknown'
                logger.debug(f"  Relation type: {rel_type_name}")
                
                if rel_type_name == 'inheritance':
                    parent_frame = getattr(relation, 'super_frame', None)
                    if not parent_frame:
                        logger.debug("  No super_frame in inheritance relation")
                        continue
                        
                    parent_id = parent_frame.get('ID')
                    logger.debug(f"  Found parent frame ID: {parent_id}")
                    
                    if parent_id == potential_parent_id:
                        logger.debug(f"  Direct match found: {parent_id} == {potential_parent_id}")
                        return True
                        
                    # Recursively check parent frames
                    logger.debug(f"  Recursively checking parent frame {parent_id}")
                    if self.is_subtype(parent_id, potential_parent_id):
                        logger.debug(f"  Found indirect match through parent {parent_id}")
                        return True
                else:
                    logger.debug(f"  Skipping non-inheritance relation: {rel_type_name}")
            
            logger.debug(f"No inheritance path found from {frame_id} to {potential_parent_id}")
            return False
            
        except Exception as e:
            logger.warning(f"Error checking if frame {frame_id} is a subtype of {potential_parent_id}: {str(e)}", exc_info=True)
            return False
    
    def get_lexical_units(self, frame: Frame) -> List[LexicalUnit]:
        """
        Get all lexical units for a frame.
        
        Args:"
            frame: The frame to get lexical units for
            
        Returns:
            List of LexicalUnit objects
        """
        try:
            frame_data = fn.frame(frame.id)
            return [
                self._convert_lexical_unit(lu)
                for lu in frame_data.get('lexUnit', {}).values()
            ]
        except Exception as e:
            raise FrameNetError(f"Error getting lexical units: {str(e)}")
    
    def get_frame_elements(self, frame: Frame) -> List[FrameElement]:
        """
        Get all frame elements (roles) for a frame.
        
        Args:
            frame: The frame to get elements for
            
        Returns:
            List of FrameElement objects
        """
        try:
            frame_data = fn.frame(frame.id)
            return [
                self._convert_frame_element(fe)
                for fe in frame_data.get('FE', {}).values()
            ]
        except Exception as e:
            raise FrameNetError(f"Error getting frame elements: {str(e)}")
    
    def get_related_frames(self, frame: Frame, relation_type: str = None) -> List[Frame]:
        """
        Get frames related to the given frame by a specific relation type.
        
        Args:
            frame: The source frame
            relation_type: Optional relation type filter (e.g., 'Inheritance', 'Using')
            
        Returns:
            List of related Frame objects
        """
        try:
            frame_data = fn.frame(frame.id)
            relations = frame_data.get('frameRelations', [])
            
            # Filter by relation type if specified
            if relation_type:
                relations = [r for r in relations 
                           if r.get('type', '').lower() == relation_type.lower()]
            
            # Get related frames
            related_frames = []
            for rel in relations:
                related_frame = rel.get('superFrame' if rel['type'] == 'Inheritance' else 'subFrame')
                if related_frame and 'ID' in related_frame:
                    related_frames.append(self._convert_frame(related_frame))
            
            return related_frames
            
        except Exception as e:
            raise FrameNetError(f"Error getting related frames: {str(e)}")
    
    def search_frames(self, query: str, max_results: int = 20) -> List[Frame]:
        """
        Search for frames by name or definition.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            
        Returns:
            List of matching Frame objects
        """
        try:
            query = query.lower()
            results = []
            
            # Search in frame names and definitions
            for frame in fn.frames():
                if (query in frame.get('name', '').lower() or 
                    query in frame.get('definition', '').lower()):
                    results.append(self._convert_frame(frame))
                    if len(results) >= max_results:
                        break
            
            return results
            
        except Exception as e:
            raise FrameNetError(f"Error searching frames: {str(e)}")


# Create a singleton instance for convenience
framenet_service = NLTKFrameNetService()
