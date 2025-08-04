"""
NLTK WordNet Service Implementation

This module provides a concrete implementation of the IWordNetService interface
using NLTK's WordNet interface.
"""
import os
import logging
import nltk
from nltk.corpus import wordnet as wn
from typing import List, Optional, Set, Dict, Any, ClassVar

from ..interfaces.wordnet_service import IWordNetService, Synset, Lemma, WordNetError

logger = logging.getLogger(__name__)

# Required NLTK data packages
# Note: These must match what's installed in the Dockerfile
REQUIRED_NLTK_DATA = [
    'wordnet',  # Core WordNet data
    # 'omw-1.4' is included in the default wordnet data
]


class NLTKWordNetService(IWordNetService):
    """
    NLTK-based implementation of the WordNet service interface.
    """
    _initialized: ClassVar[bool] = False
    _nltk_data_path: ClassVar[Optional[str]] = None
    
    def __init__(self, nltk_data_path: str = None):
        """
        Initialize the NLTK WordNet service.
        
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
            
            # Verify WordNet is available
            wn.ensure_loaded()
            cls._initialized = True
            logger.info("NLTK WordNet service initialized successfully")
            
        except LookupError as e:
            error_msg = (
                "WordNet data not found. Please ensure NLTK data is downloaded.\n"
                "You can download it using the management command:\n"
                "    python manage.py init_nltk"
            )
            logger.error(error_msg)
            raise WordNetError(error_msg) from e
            
        except Exception as e:
            error_msg = f"Failed to initialize WordNet: {str(e)}"
            logger.error(error_msg)
            raise WordNetError(error_msg) from e
    
    def is_available(self) -> bool:
        """Check if the WordNet service is available and data is accessible."""
        try:
            return wn.get_version() is not None
        except Exception:
            return False
    
    def _convert_lemma(self, wn_lemma) -> Lemma:
        """Convert NLTK Lemma to our Lemma DTO."""
        return Lemma(
            name=wn_lemma.name(),
            pos=wn_lemma.synset().pos(),
            count=wn_lemma.count()
        )
    
    def _convert_synset(self, wn_synset) -> Synset:
        """Convert NLTK Synset to our Synset DTO."""
        return Synset(
            name=wn_synset.name(),
            pos=wn_synset.pos(),
            definition=wn_synset.definition(),
            examples=list(wn_synset.examples()),
            lemmas=[self._convert_lemma(lemma) for lemma in wn_synset.lemmas()],
            lexname=wn_synset.lexname(),
            offset=wn_synset.offset()
        )
    
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
        try:
            wn_synsets = wn.synsets(lemma, pos=pos) if lemma else []
            return [self._convert_synset(s) for s in wn_synsets]
        except Exception as e:
            raise WordNetError(f"Error getting synsets for '{lemma}': {str(e)}")
    
    def get_hypernyms(self, synset: Synset) -> List[Synset]:
        """
        Get hypernyms (more general synsets) of the given synset.
        
        Args:
            synset: The synset to find hypernyms for
            
        Returns:
            List of hypernym Synset objects
        """
        try:
            wn_synset = wn.synset(synset.name)
            return [self._convert_synset(h) for h in wn_synset.hypernyms()]
        except Exception as e:
            raise WordNetError(f"Error getting hypernyms: {str(e)}")
    
    def get_hyponyms(self, synset: Synset) -> List[Synset]:
        """
        Get hyponyms (more specific synsets) of the given synset.
        
        Args:
            synset: The synset to find hyponyms for
            
        Returns:
            List of hyponym Synset objects
        """
        try:
            wn_synset = wn.synset(synset.name)
            return [self._convert_synset(h) for h in wn_synset.hyponyms()]
        except Exception as e:
            raise WordNetError(f"Error getting hyponyms: {str(e)}")
    
    def get_lemma_names(self, synset: Synset) -> List[str]:
        """
        Get all lemma names for a synset.
        
        Args:
            synset: The synset to get lemmas for
            
        Returns:
            List of lemma names
        """
        try:
            wn_synset = wn.synset(synset.name)
            return wn_synset.lemma_names()
        except Exception as e:
            raise WordNetError(f"Error getting lemma names: {str(e)}")
    
    def get_synset_by_name(self, name: str) -> Optional[Synset]:
        """
        Get a synset by its name (e.g., 'dog.n.01').
        
        Args:
            name: The name of the synset to retrieve
            
        Returns:
            The Synset object, or None if not found
        """
        try:
            wn_synset = wn.synset(name)
            return self._convert_synset(wn_synset)
        except Exception:
            return None
    
    def is_ancestor_of(self, ancestor: Synset, descendant: Synset) -> bool:
        """
        Check if one synset is an ancestor of another in the WordNet hierarchy.
        
        Args:
            ancestor: Potential ancestor synset
            descendant: Potential descendant synset
            
        Returns:
            True if ancestor is an ancestor of descendant
        """
        try:
            # Convert our synset DTOs to NLTK synsets
            anc_wn = wn.synset(ancestor.name)
            desc_wn = wn.synset(descendant.name)
            
            # Get all hypernym paths from descendant to root
            for path in desc_wn.hypernym_paths():
                if anc_wn in path:
                    return True
            return False
        except Exception as e:
            raise WordNetError(f"Error checking ancestry: {str(e)}")


# Create a singleton instance for convenience
wordnet_service = NLTKWordNetService()
