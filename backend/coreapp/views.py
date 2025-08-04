"""
Views for the Frame and Element models.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Frame, Element, Entity
from .serializers import FrameSerializer, ElementSerializer
from arb.nltk_impl.framenet_wrapper import framenet_service
from arb.interfaces.framenet_service import FrameNetError


class FrameViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows frames to be viewed or edited.
    """
    serializer_class = FrameSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'definition']
    ordering_fields = ['name', 'created_at', 'updated_at', 'is_primary']
    ordering = ['-is_primary', 'name']

    def get_queryset(self):
        """
        Optionally filter by entity_id if provided in the query parameters.
        """
        queryset = Frame.objects.all()
        entity_id = self.request.query_params.get('entity_id')
        if entity_id is not None:
            queryset = queryset.filter(entity_id=entity_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create a frame with validation for required core elements.
        """
        # Get frame type from request data
        frame_type = request.data.get('frame_type')
        if not frame_type:
            frame_type = request.data.get('name')
        
        # If we have a frame type, validate required core elements
        if frame_type:
            try:
                # Get required core elements for this frame type
                frame = framenet_service.get_frame_by_name(frame_type)
                if frame:
                    required_elements = [
                        element.name for element in frame.elements 
                        if element.core_type in ['Core', 'Core-Unexpressed']
                    ]
                    
                    # Check if elements data is provided
                    elements_data = request.data.get('elements', [])
                    
                    # Extract element names from provided data
                    provided_element_names = [
                        element.get('name') for element in elements_data 
                        if element.get('name')
                    ]
                    
                    # Check if all required elements are provided
                    missing_elements = [
                        element for element in required_elements 
                        if element not in provided_element_names
                    ]
                    
                    if missing_elements:
                        return Response(
                            {
                                'error': 'Missing required core elements',
                                'missing_elements': missing_elements,
                                'required_elements': required_elements
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
            except FrameNetError as e:
                # Log the error but don't fail frame creation
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not validate core elements for frame type {frame_type}: {str(e)}")
            except Exception as e:
                # Log the error but don't fail frame creation
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Unexpected error validating core elements for frame type {frame_type}: {str(e)}")
        
        # Continue with normal creation process
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Ensure the frame is associated with the correct entity.
        """
        entity_id = self.request.data.get('entity')
        if entity_id:
            entity = get_object_or_404(Entity, pk=entity_id)
            serializer.save(entity=entity)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """
        Set this frame as the primary frame for its entity.
        This will automatically demote any other primary frames for the entity.
        """
        frame = self.get_object()
        frame.is_primary = True
        frame.save()
        return Response({'status': 'frame set as primary'})


class ElementViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows elements to be viewed or edited.
    """
    serializer_class = ElementSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'definition', 'value']
    ordering_fields = ['name', 'core_type', 'created_at', 'updated_at']
    ordering = ['core_type', 'name']

    def get_queryset(self):
        """
        Optionally filter by frame_id if provided in the query parameters.
        """
        queryset = Element.objects.all()
        frame_id = self.request.query_params.get('frame_id')
        if frame_id is not None:
            queryset = queryset.filter(frame_id=frame_id)
        return queryset


class FrameNetViewSet(viewsets.ViewSet):
    """
    API endpoint for FrameNet-related operations.
    """
    @action(detail=False, methods=['get'])
    def types(self, request):
        """
        Get a list of all available frame types.
        """
        # This is a hardcoded list of common frame types
        # In a real implementation, this would come from a FrameNet database
        frame_types = [
            'Accomplishment',
            'Activity',
            'Being_employed',
            'Cause_change_of_position_on_a_scale',
            'Causation',
            'Change_of_leadership',
            'Change_position_on_a_scale',
            'Commerce_buy',
            'Commerce_sell',
            'Coming_to_believe',
            'Communication',
            'Competition',
            'Creating',
            'Destroying',
            'Event',
            'Getting',
            'Giving',
            'Hunting',
            'Influence',
            'Intentionally_act',
            'Killing',
            'Know',
            'Motion',
            'Perception_experience',
            'Placing',
            'Process_end',
            'Process_start',
            'Process_stop',
            'Quitting',
            'Reveal_secret',
            'Scrutiny',
            'Statement',
            'State_continue',
            'State_end',
            'State_start',
            'Telling',
            'Use_firearm',
            'Using',
        ]
        
        return Response({
            'count': len(frame_types),
            'results': [{'id': i, 'name': ft, 'display_name': ft.replace('_', ' ')} 
                       for i, ft in enumerate(frame_types, 1)]
        })

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

        # This is a placeholder for actual FrameNet integration
        # In a real implementation, you would query the FrameNet database here
        frames = Frame.objects.filter(
            Q(name__icontains=query) |
            Q(definition__icontains=query)
        )
        
        serializer = FrameSerializer(frames, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def suggest(self, request, pk=None):
        """
        Get suggested frames for an entity based on its properties.
        """
        entity = get_object_or_404(Entity, pk=pk)
        
        # This is a placeholder for actual suggestion logic
        # In a real implementation, you would use the entity's properties
        # to suggest relevant frames from FrameNet
        suggested_frames = Frame.objects.filter(
            entity=entity
        ).order_by('?')[:5]  # Random sample for demo
        
        serializer = FrameSerializer(suggested_frames, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='elements')
    def elements(self, request):
        """
        Get frame elements for a specific frame type.
        """
        frame_type = request.query_params.get('frame_type')
        if not frame_type:
            return Response(
                {'error': 'Frame type is required as a query parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not frame_type:
            return Response(
                {'error': 'Frame type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Try to get frame by name from FrameNet
            frame = framenet_service.get_frame_by_name(frame_type)
            if not frame:
                return Response(
                    {'error': f'Frame type "{frame_type}" not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Return frame elements with flat structure
            elements_data = []
            for element in frame.elements:
                element_data = {
                    'id': element.id,
                    'name': element.name.name if hasattr(element, 'name') and hasattr(element.name, 'name') else str(getattr(element, 'name', '')),
                    'core_type': element.name.core_type.lower() if hasattr(element, 'name') and hasattr(element.name, 'core_type') else getattr(element, 'core_type', '').lower(),
                    'definition': element.name.definition if hasattr(element, 'name') and hasattr(element.name, 'definition') else getattr(element, 'definition', '')
                }
                elements_data.append(element_data)
            
            return Response({
                'frame_type': frame.name,
                'elements': elements_data
            })
            
        except FrameNetError as e:
            return Response(
                {'error': f'FrameNet service error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {'error': f'Unexpected error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
