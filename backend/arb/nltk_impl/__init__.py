"""
NLTK-based implementations of lexical services.

This package contains concrete implementations of the WordNet and FrameNet
service interfaces using NLTK's data and APIs.
"""

from .wordnet_wrapper import NLTKWordNetService
from .framenet_wrapper import NLTKFrameNetService

__all__ = ['NLTKWordNetService', 'NLTKFrameNetService']
