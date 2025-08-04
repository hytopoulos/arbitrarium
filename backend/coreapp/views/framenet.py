"""
Views for FrameNet-related operations.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import Entity
from ..services.frame_suggestor import FrameSuggestor
from arb.framenet import FrameNetService
from arb.interfaces.framenet_service import FrameNetError

logger = logging.getLogger(__name__)

class FrameNetViewSet(viewsets.ViewSet):
    """
    API endpoint for FrameNet-related operations.
    Uses the FrameSuggestor service for all FrameNet operations.
    """
    @action(detail=False, methods=['get'])
    def types(self, request):
        """
        Get a list of all available frame types from FrameNet.
        Returns:
            {
                'count': int,  # Total number of frame types
                'results': [   # List of frame type objects
                    {
                        'id': int,
                        'name': str,
                        'display_name': str
                    },
                    ...
                ]
            }
        """
        try:
            frame_types = FrameSuggestor.get_all_frame_types()
            result = {
                'count': len(frame_types),
                'results': frame_types
            }
            return Response(result)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch frame types from FrameNet: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search for frames by name or definition.
        """
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {'error': 'Query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = FrameSuggestor.search_frames(query)
            return Response(result)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to search FrameNet: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def suggest(self, request, pk=None):
        """
        Get suggested frames for an entity based on its properties.
        """
        entity = get_object_or_404(Entity, pk=pk)
        limit = int(request.query_params.get('limit', 5))
        
        try:
            result = FrameSuggestor.suggest_frames(entity, limit)
            return Response({
                'count': len(result),
                'results': result
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to suggest frames: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def elements(self, request):
        """
        Get frame elements for a specific frame type.
        
        Query Parameters:
            frame_type: The name of the frame to get elements for
            
        Returns:
            {
                'frame_type': str,  # The name of the frame
                'elements': [       # List of frame elements
                    {
                        'id': int,
                        'name': str,
                        'core_type': str,
                        'definition': str
                    },
                    ...
                ]
            }
        """
        logger.info(f"[FrameNet] Received request for frame elements. Query params: {request.query_params}")
        frame_type = request.query_params.get('frame_type')
        if not frame_type:
            logger.warning("[FrameNet] No frame_type provided in request")
            return Response(
                {'error': 'Query parameter "frame_type" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            logger.info(f"[FrameNet] Getting elements for frame: {frame_type}")
            # Initialize FrameNet service
            framenet_service = FrameNetService()
            
            # Get frame by name
            frame = framenet_service.get_frame_by_name(frame_type)
            if not frame:
                logger.warning(f"[FrameNet] Frame not found: {frame_type}")
                return Response(
                    {'error': f'Frame type "{frame_type}" not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            logger.debug(f"[FrameNet] Frame data: {frame}")
            
            # Get frame elements from the frame data
            frame_elements = frame.get('frame_elements', [])
            logger.info(f"[FrameNet] Found {len(frame_elements)} elements in frame")
            
            # Format the elements as expected by the frontend
            elements_data = []
            for idx, element in enumerate(frame_elements):
                # Handle case where element might be a string or an object
                if isinstance(element, dict):
                    # If element has a nested name object, use its properties
                    name_obj = element.get('name', {})
                    if isinstance(name_obj, dict):
                        element_data = {
                            'id': idx + 1,  # Use 1-based index as ID
                            'name': name_obj.get('name', element.get('name', '')),
                            'core_type': name_obj.get('core_type', element.get('core_type', 'core')).lower(),
                            'definition': name_obj.get('definition', element.get('definition', f"Frame element for {frame_type}"))
                        }
                    else:
                        # If name is a string
                        element_data = {
                            'id': idx + 1,
                            'name': str(name_obj),
                            'core_type': element.get('core_type', 'core').lower(),
                            'definition': element.get('definition', f"Frame element for {frame_type}")
                        }
                else:
                    # If element is just a string
                    element_data = {
                        'id': idx + 1,
                        'name': str(element),
                        'core_type': 'core',
                        'definition': f"Frame element for {frame_type}"
                    }
                elements_data.append(element_data)
            
            logger.info(f"[FrameNet] Returning {len(elements_data)} elements for frame {frame_type}")
            
            return Response({
                'frame_type': frame.get('name', frame_type),
                'elements': elements_data
            })
            
            logger.info(f"[FrameNet] Returning {len(elements_data)} elements for frame {frame_type}")
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"[FrameNet] Error fetching frame elements: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error fetching frame elements: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
