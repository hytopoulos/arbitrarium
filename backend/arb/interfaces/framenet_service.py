"""
FrameNet Service Interface

Defines the interface for FrameNet operations, allowing for different implementations
while maintaining a consistent API for the rest of the application.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Set


@dataclass
class FrameElement:
    """Represents a FrameNet frame element (role)."""
    id: int
    name: str
    core_type: str  # 'Core', 'Core-Unexpressed', 'Peripheral', 'Extra-Thematic'
    definition: str = ""
    
    def __hash__(self):
        return hash((self.id, self.name))


@dataclass
class LexicalUnit:
    """Represents a lexical unit in FrameNet."""
    id: int
    name: str  # Lemma.POS format, e.g., 'abandon.v'
    pos: str  # Part of speech
    definition: str = ""
    
    def __hash__(self):
        return hash((self.id, self.name))


@dataclass
class Frame:
    """Represents a FrameNet frame with its elements and lexical units."""
    id: int
    name: str
    definition: str
    lexical_units: List[LexicalUnit] = field(default_factory=list)
    elements: List[FrameElement] = field(default_factory=list)
    sem_types: List[Dict[str, Any]] = field(default_factory=list)
    
    def __hash__(self):
        return hash((self.id, self.name))
    
    def get_element(self, name: str) -> Optional[FrameElement]:
        """Get a frame element by name."""
        for element in self.elements:
            if element.name.lower() == name.lower():
                return element
        return None


class FrameNetError(Exception):
    """Base exception for FrameNet service errors."""
    pass


class IFrameNetService(ABC):
    """
    Abstract base class for FrameNet services.
    
    This defines the interface that all FrameNet service implementations must follow.
    """
    
    @abstractmethod
    def get_frame(self, frame_id: int) -> Optional[Frame]:
        """
        Get a frame by its ID.
        
        Args:
            frame_id: The ID of the frame to retrieve
            
        Returns:
            The Frame object, or None if not found
            
        Raises:
            FrameNetError: If there's an error accessing the FrameNet data
        """
        pass
    
    @abstractmethod
    def get_frame_by_name(self, name: str) -> Optional[Frame]:
        """
        Get a frame by its name.
        
        Args:
            name: The name of the frame to retrieve (case-insensitive)
            
        Returns:
            The Frame object, or None if not found
        """
        pass
    
    @abstractmethod
    def get_frames_by_lemma(self, lemma: str, pos: str = None) -> List[Frame]:
        """
        Get all frames associated with a given lemma.
        
        Args:
            lemma: The lemma to search for
            pos: Optional part of speech filter
            
        Returns:
            List of matching Frame objects
        """
        pass
    
    @abstractmethod
    def get_lexical_units(self, frame: Frame) -> List[LexicalUnit]:
        """
        Get all lexical units for a frame.
        
        Args:
            frame: The frame to get lexical units for
            
        Returns:
            List of LexicalUnit objects
        """
        pass
    
    @abstractmethod
    def get_frame_elements(self, frame: Frame) -> List[FrameElement]:
        """
        Get all frame elements (roles) for a frame.
        
        Args:
            frame: The frame to get elements for
            
        Returns:
            List of FrameElement objects
        """
        pass
    
    @abstractmethod
    def get_related_frames(self, frame: Frame, relation_type: str = None) -> List[Frame]:
        """
        Get frames related to the given frame by a specific relation type.
        
        Args:
            frame: The source frame
            relation_type: Optional relation type filter (e.g., 'Inheritance', 'Using')
            
        Returns:
            List of related Frame objects
        """
        pass
    
    @abstractmethod
    def search_frames(self, query: str, max_results: int = 20) -> List[Frame]:
        """
        Search for frames by name or definition.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            
        Returns:
            List of matching Frame objects
        """
        pass
