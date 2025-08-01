"""
Tests for service classes.
"""
import pytest
from unittest.mock import MagicMock
from coreapp.models import Entity
from coreapp.services.frame_suggestor import FrameSuggestor

@pytest.mark.django_db
class TestFrameSuggestor:
    """Tests for the FrameSuggestor service class."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data."""
        self.entity = Entity(wnid='n00001740')  # 'entity' synset
        
    def test_get_cache_key(self):
        """Test generating cache keys."""
        key = FrameSuggestor.get_cache_key(123, 5)
        assert key == 'frame_suggestions_123_5'
        
    def test_suggest_frames_caching(self, mocker):
        """Test that frame suggestions are cached."""
        # Mock the cache and the _suggest_frames_uncached method
        mock_cache = {}
        
        def mock_cache_get(key, default=None):
            return mock_cache.get(key, default)
            
        def mock_cache_set(key, value, timeout=None):
            mock_cache[key] = value
            
        mocker.patch('django.core.cache.cache.get', mock_cache_get)
        mocker.patch('django.core.cache.cache.set', mock_cache_set)
        
        # Mock the actual frame suggestion logic
        mock_suggestions = [{'name': 'Test Frame', 'fnid': 'fn123'}]
        mocker.patch.object(
            FrameSuggestor, 
            '_suggest_frames_uncached', 
            return_value=mock_suggestions
        )
        
        # First call - should call _suggest_frames_uncached
        result1 = FrameSuggestor.suggest_frames(self.entity)
        assert result1 == mock_suggestions
        assert FrameSuggestor._suggest_frames_uncached.call_count == 1
        
        # Second call - should use cache
        result2 = FrameSuggestor.suggest_frames(self.entity)
        assert result2 == mock_suggestions
        assert FrameSuggestor._suggest_frames_uncached.call_count == 1  # Still 1
        
    def test_suggest_frames_with_lex_units(self, mocker):
        """Test frame suggestions with mock lexical units."""
        # Mock the util.ss2lu function to return test lexical units
        mock_lex_units = [
            {
                'name': 'test.lex',
                'frame': {
                    'ID': 'fn123',
                    'name': 'Test Frame',
                    'definition': 'A test frame',
                }
            }
        ]
        
        mocker.patch('coreapp.util.ss2lu', return_value=mock_lex_units)
        
        # Call the method
        suggestions = FrameSuggestor._suggest_frames_uncached(self.entity)
        
        # Verify the results
        assert len(suggestions) == 1
        assert suggestions[0]['name'] == 'Test Frame'
        assert suggestions[0]['fnid'] == 'fn123'
        assert suggestions[0]['score'] == 1.0
        assert suggestions[0]['match_type'] == 'direct'
        
    def test_suggest_frames_no_lex_units(self, mocker):
        """Test frame suggestions when no lexical units are found."""
        # Mock the util.ss2lu function to return no lexical units
        mocker.patch('coreapp.util.ss2lu', return_value=[])
        
        # Mock the related synsets method to return a mock synset
        mock_synset = MagicMock()
        mock_synset.hypernyms.return_value = []
        mock_synset.hyponyms.return_value = []
        mocker.patch('nltk.corpus.wordnet.synset', return_value=mock_synset)
        
        # Call the method
        suggestions = FrameSuggestor._suggest_frames_uncached(self.entity)
        
        # Should return an empty list when no suggestions are found
        assert suggestions == []
        
    def test_suggest_frames_from_related(self, mocker):
        """Test finding frames through related synsets."""
        # Create mock synsets
        mock_synset = MagicMock()
        mock_related_synset = MagicMock()
        
        # Set up the mock to return related synsets
        mock_synset.hypernyms.return_value = [mock_related_synset]
        mock_synset.hyponyms.return_value = []
        mock_related_synset.hypernyms.return_value = []
        mock_related_synset.hyponyms.return_value = []
        
        # Mock the lexical units for the related synset
        mock_lex_units = [
            {
                'name': 'related.lex',
                'frame': {
                    'ID': 'fn456',
                    'name': 'Related Frame',
                    'definition': 'A related frame',
                }
            }
        ]
        
        # Mock the util.ss2lu function to return different results
        def mock_ss2lu(synset):
            if synset == mock_related_synset:
                return mock_lex_units
            return []
            
        mocker.patch('coreapp.util.ss2lu', side_effect=mock_ss2lu)
        
        # Call the method
        suggestions = FrameSuggestor._suggest_frames_from_related(mock_synset, max_depth=2)
        
        # Verify the results
        assert len(suggestions) == 1
        assert suggestions[0]['name'] == 'Related Frame'
        assert suggestions[0]['fnid'] == 'fn456'
        assert 0 < suggestions[0]['score'] < 1.0  # Should be less than 1.0 for related frames
        assert 'related_depth' in suggestions[0]['match_type']
