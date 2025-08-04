"""
WordNet Service Interface

Defines the interface for WordNet operations, allowing for different implementations
while maintaining a consistent API for the rest of the application.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass
class Lemma:
    """Represents a WordNet lemma with its part of speech and count."""
    name: str
    pos: str
    count: int = 0


@dataclass
class Synset:
    """Represents a WordNet synset with its definition and examples."""
    name: str
    pos: str
    definition: str
    examples: List[str]
    lemmas: List[Lemma]
    lexname: str
    offset: int
    
    def __hash__(self):
        return hash((self.name, self.pos, self.offset))


class WordNetError(Exception):
    """Base exception for WordNet service errors."""
    pass


class IWordNetService(ABC):
    """
    Abstract base class for WordNet services.
    
    This defines the interface that all WordNet service implementations must follow.
    """
    
    @abstractmethod
    def get_synsets(self, lemma: str, pos: str = None) -> List[Synset]:
        """
        Get all synsets for a given lemma and optional part of speech.
        
        Args:
            lemma: The word or collocation to look up
            pos: Optional part of speech (e.g., 'n' for noun, 'v' for verb)
            
        Returns:
            List of Synset objects
            
        Raises:
            WordNetError: If there's an error accessing the WordNet data
        """
        pass
    
    @abstractmethod
    def get_hypernyms(self, synset: Synset) -> List[Synset]:
        """
        Get hypernyms (more general synsets) of the given synset.
        
        Args:
            synset: The synset to find hypernyms for
            
        Returns:
            List of hypernym Synset objects
        """
        pass
    
    @abstractmethod
    def get_hyponyms(self, synset: Synset) -> List[Synset]:
        """
        Get hyponyms (more specific synsets) of the given synset.
        
        Args:
            synset: The synset to find hyponyms for
            
        Returns:
            List of hyponym Synset objects
        """
        pass
    
    @abstractmethod
    def get_lemma_names(self, synset: Synset) -> List[str]:
        """
        Get all lemma names for a synset.
        
        Args:
            synset: The synset to get lemmas for
            
        Returns:
            List of lemma names
        """
        pass
    
    @abstractmethod
    def get_synset_by_name(self, name: str) -> Optional[Synset]:
        """
        Get a synset by its name (e.g., 'dog.n.01').
        
        Args:
            name: The name of the synset to retrieve
            
        Returns:
            The Synset object, or None if not found
        """
        pass
    
    @abstractmethod
    def is_ancestor_of(self, ancestor: Synset, descendant: Synset) -> bool:
        """
        Check if one synset is an ancestor of another in the WordNet hierarchy.
        
        Args:
            ancestor: Potential ancestor synset
            descendant: Potential descendant synset
            
        Returns:
            True if ancestor is an ancestor of descendant
        """
        pass
