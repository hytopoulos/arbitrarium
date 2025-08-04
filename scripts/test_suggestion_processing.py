#!/usr/bin/env python

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append('/Users/theo/arbitrarium/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from coreapp.services.framenet.framenet_service import FrameNetService
from coreapp.services.frame_suggestion import FrameSuggestionService

# Get suggestions for FrameNet ID 2307 (family.n)
frame_net = FrameNetService()
suggestion_service = FrameSuggestionService(frame_net)
raw_suggestions = suggestion_service.suggest_frames(['2307'])

print('Raw suggestions:')
for suggestion in raw_suggestions:
    print(f'  {suggestion}')

# Process suggestions to match the expected template format
suggestions = []
for suggestion in raw_suggestions:
    # Handle both direct frame suggestions and suggestions with frame data
    if isinstance(suggestion, dict) and 'frame' in suggestion:
        # This is a suggestion with detailed frame data
        frame_data = suggestion['frame']
        suggestions.append({
            'name': frame_data.get('name', 'Unknown Frame'),
            'fnid': frame_data.get('id', frame_data.get('fnid', '')),
            'definition': frame_data.get('definition', ''),
            'score': suggestion.get('score', 0),
            'elements': []  # TODO: Add elements if needed
        })
    elif isinstance(suggestion, dict):
        # This is a direct frame suggestion
        suggestions.append({
            'name': suggestion.get('name', 'Unknown Frame'),
            'fnid': suggestion.get('id', suggestion.get('fnid', '')),
            'definition': suggestion.get('definition', ''),
            'score': suggestion.get('score', 0),
            'elements': suggestion.get('elements', [])
        })

print('\nProcessed suggestions:')
for suggestion in suggestions:
    print(f'  {suggestion}')
