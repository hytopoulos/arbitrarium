from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache
from nltk.corpus import wordnet as wn
from django.core.cache import cache
from django.conf import settings
from coreapp.models import Entity, Frame
from arb import util
from coreapp.services.framenet import FrameNetService
import logging

logger = logging.getLogger(__name__)

# Cache timeout in seconds (1 hour)
CACHE_TIMEOUT = 60 * 60

# Initialize FrameNet service
framenet_service = FrameNetService()

class FrameSuggestor:
    """
    Service class for suggesting frames for entities based on WordNet and FrameNet data.
    """
    
    @staticmethod
    def get_cache_key(entity_id: int, limit: int) -> str:
        """Generate a cache key for frame suggestions."""
        return f'frame_suggestions_{entity_id}_{limit}'

    @classmethod
    def suggest_frames(cls, entity: Entity, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Suggest relevant frames for a given entity with caching.
        
        Args:
            entity: The entity to suggest frames for
            limit: Maximum number of frames to return
            
        Returns:
            List of dictionaries containing frame information and relevance scores
        """
        cache_key = cls.get_cache_key(entity.id, limit)
        
        # Try to get from cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return cached_result
            
        # If not in cache, generate the suggestions
        result = cls._suggest_frames_uncached(entity, limit)
        
        # Store in cache
        cache.set(cache_key, result, timeout=CACHE_TIMEOUT)
        return result
        
    @classmethod
    def _suggest_frames_uncached(cls, entity: Entity, limit: int) -> List[Dict[str, Any]]:
        """
        Suggest relevant frames for a given entity.
        
        Args:
            entity: The entity to suggest frames for
            limit: Maximum number of frames to return
            
        Returns:
            List of dictionaries containing frame information and relevance scores
        """
        try:
            # Get the WordNet synset for the entity
            synset = wn.synset_from_pos_and_offset('n', int(entity.wnid[1:]))
            
            # Get lexical units for this synset
            lex_units = util.ss2lu(synset)
            
            if not lex_units:
                logger.warning(f"No lexical units found for synset {entity.wnid}")
                return []
                
            # Get frames associated with these lexical units
            frames = []
            for lu in lex_units:
                frame = lu.get('frame', {})
                if frame:
                    frame_info = {
                        'fnid': frame.get('ID'),
                        'name': frame.get('name', ''),
                        'definition': frame.get('definition', ''),
                        'score': 1.0,  # Base score for direct matches
                        'match_type': 'direct',
                        'lex_unit': lu.get('name', '')
                    }
                    frames.append(frame_info)
            
            # If no direct matches, try to find frames through related synsets
            if not frames:
                frames = FrameSuggestor._suggest_frames_from_related(synset)
            
            # Sort by score in descending order and limit results
            frames.sort(key=lambda x: x['score'], reverse=True)
            return frames[:limit]
            
        except Exception as e:
            logger.error(f"Error suggesting frames for entity {entity.id}: {str(e)}", exc_info=True)
            return []
    
    @classmethod
    def get_all_frame_types(cls) -> List[Dict[str, Any]]:
        """
        Get all available frame types from FrameNet.
        
        Returns:
            List of dictionaries containing frame type information
        """
        try:
            # Check if FrameNet service is properly initialized
            if not framenet_service:
                logger.error("FrameNet service is not initialized")
                return []
                
            logger.info("Fetching frames from FrameNet service...")
            frames = framenet_service.get_all_frames()
            
            if not frames:
                logger.warning("No frames returned from FrameNet service")
                return []
                
            result = []
            for frame in frames:
                try:
                    frame_id = frame.get('ID')
                    frame_name = frame.get('name', f'frame_{frame_id}' if frame_id else 'unknown_frame')
                    
                    frame_data = {
                        'id': frame_id,
                        'name': frame_name,
                        'display_name': frame_name.replace('_', ' ').title(),
                        'definition': frame.get('definition', ''),
                        'lex_unit_count': frame.get('lex_unit_count', 0)
                    }
                    result.append(frame_data)
                except Exception as frame_error:
                    logger.error(f"Error processing frame {frame.get('name', 'unknown')}: {str(frame_error)}", exc_info=True)
            
            logger.info(f"Successfully processed {len(result)} frames")
            return result
            
        except Exception as e:
            logger.error("Error in get_all_frame_types:", exc_info=True)
            logger.error(f"Error details: {str(e)}")
            
            # Log FrameNet service state if available
            if hasattr(framenet_service, '__dict__'):
                logger.error(f"FrameNet service state: {framenet_service.__dict__}")
            else:
                logger.error("FrameNet service has no __dict__ attribute")
                
            # Return an empty list instead of raising an exception to prevent 500 errors
            # This allows the frontend to handle the empty state gracefully
            return []
            
    @classmethod
    def get_frame_by_id(cls, frame_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a frame by its FrameNet ID.
        
        Args:
            frame_id: The FrameNet ID of the frame to retrieve
            
        Returns:
            Dictionary containing frame information, or None if not found
        """
        try:
            frame = framenet_service.get_frame_by_id(frame_id)
            if not frame:
                return None
                
            return {
                'id': frame.get('ID'),
                'name': frame.get('name', ''),
                'definition': frame.get('definition', '')
            }
        except Exception as e:
            logger.error(f"Error getting frame by ID {frame_id}: {str(e)}", exc_info=True)
            return None

    @classmethod
    def _suggest_frames_from_related(cls, synset, max_depth: int = 2) -> List[Dict[str, Any]]:
        """
        Find frames by exploring related synsets (hypernyms, hyponyms, etc.).
        """
        from collections import deque
        
        visited = set()
        queue = deque([(synset, 0)])  # (synset, depth)
        frames = []
        
        while queue:
            current_synset, depth = queue.popleft()
            
            # Skip if we've already visited this synset or reached max depth
            if current_synset.offset() in visited or depth > max_depth:
                continue
                
            visited.add(current_synset.offset())
            
            # Get frames for this synset
            lex_units = util.ss2lu(current_synset)
            for lu in lex_units:
                frame = lu.get('frame', {})
                if frame:
                    # Calculate score based on depth (deeper = lower score)
                    score = 1.0 / (depth + 1)
                    
                    frame_info = {
                        'fnid': frame.get('ID'),
                        'name': frame.get('name', ''),
                        'definition': frame.get('definition', ''),
                        'score': score,
                        'match_type': f"related_depth_{depth}",
                        'lex_unit': lu.get('name', '')
                    }
                    frames.append(frame_info)
            
            # Add related synsets to the queue if we haven't reached max depth
            if depth < max_depth:
                relations = [
                    *current_synset.hypernyms(),
                    *current_synset.hyponyms(),
                    *current_synset.part_meronyms(),
                    *current_synset.part_holonyms(),
                    *current_synset.member_holonyms(),
                    *current_synset.substance_meronyms(),
                    *current_synset.substance_holonyms(),
                    *current_synset.entailments(),
                    *current_synset.causes(),
                    *current_synset.also_sees(),
                    *current_synset.verb_groups(),
                    *current_synset.similar_tos()
                ]
                
                for rel in relations:
                    if rel.offset() not in visited:
                        queue.append((rel, depth + 1))
        
        return frames
