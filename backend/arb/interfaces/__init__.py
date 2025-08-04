"""
Interfaces for lexical services.

This package contains abstract base classes that define the interfaces
for WordNet and FrameNet services. These interfaces should be implemented
by concrete service providers.
"""

from .wordnet_service import IWordNetService, Synset, Lemma, WordNetError
from .framenet_service import IFrameNetService, Frame, FrameElement, FrameNetError

__all__ = [
    'IWordNetService',
    'IFrameNetService',
    'Synset',
    'Lemma',
    'Frame',
    'FrameElement',
    'WordNetError',
    'FrameNetError'
]
