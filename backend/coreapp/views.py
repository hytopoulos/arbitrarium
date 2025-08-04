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
        # Log the request data for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Frame creation request data: {request.data}")
        
        # Get frame type from request data
        frame_type = request.data.get('frame_type')
        if not frame_type:
            frame_type = request.data.get('name')
            logger.info(f"Using 'name' as frame_type: {frame_type}")
        
        logger.info(f"Frame type for validation: {frame_type}")
        
        # If we have a frame type, validate required core elements
        if frame_type:
            try:
                # Get required core elements for this frame type
                logger.info(f"Fetching frame data for: {frame_type}")
                frame = framenet_service.get_frame_by_name(frame_type)
                if frame:
                    required_elements = [
                        element.name for element in frame.elements 
                        if element.core_type in ['Core', 'Core-Unexpressed']
                    ]
                    logger.info(f"Required core elements for {frame_type}: {required_elements}")
                    
                    # Check if elements data is provided
                    elements_data = request.data.get('elements', [])
                    logger.info(f"Elements data provided: {elements_data}")
                    
                    # Extract element names from provided data
                    provided_element_names = [
                        element.get('name') for element in elements_data 
                        if element.get('name')
                    ]
                    logger.info(f"Provided element names: {provided_element_names}")
                    
                    # Check if all required elements are provided
                    missing_elements = [
                        element for element in required_elements 
                        if element not in provided_element_names
                    ]
                    logger.info(f"Missing elements: {missing_elements}")
                    
                    if missing_elements:
                        error_message = f"Missing required core elements for frame type '{frame_type}'. Required: {required_elements}, Provided: {provided_element_names}, Missing: {missing_elements}"
                        logger.warning(error_message)
                        return Response(
                            {
                                'error': 'Missing required core elements',
                                'missing_elements': missing_elements,
                                'required_elements': required_elements,
                                'provided_elements': provided_element_names,
                                'message': error_message
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    logger.warning(f"Frame not found for frame type: {frame_type}")
            except FrameNetError as e:
                # Log the error but don't fail frame creation
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not validate core elements for frame type {frame_type}: {str(e)}", exc_info=True)
            except Exception as e:
                # Log the error but don't fail frame creation
                logger = logging.getLogger(__name__)
                logger.warning(f"Unexpected error validating core elements for frame type {frame_type}: {str(e)}", exc_info=True)
        
        # Continue with normal creation process
        logger.info("Proceeding with normal frame creation process")
        try:
            result = super().create(request, *args, **kwargs)
            logger.info(f"Frame created successfully: {result.data if hasattr(result, 'data') else 'No data'}")
            return result
        except Exception as e:
            logger.error(f"Error during frame creation: {str(e)}", exc_info=True)
            raise

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

    def create(self, request, *args, **kwargs):
        """
        Create an element with detailed error logging.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Element creation request data: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Element serializer validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return super().create(request, *args, **kwargs)

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
                    'name': element.name,
                    'core_type': element.core_type.lower(),
                    'definition': element.definition,
                    'fnid': element.name  # Use the element name as the FrameNet ID
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
            
    @action(detail=True, methods=['get'], url_path='elements')
    def frame_elements(self, request, pk=None):
        """
        Get frame elements for a specific frame by its ID.
        """
        try:
            # Get the frame from the database
            frame = self.get_object()
            
            # Get the frame type from the frame
            frame_type = frame.frame_type
            if not frame_type:
                return Response(
                    {'error': 'Frame does not have a valid frame type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the frame elements from FrameNet
            frame = framenet_service.get_frame_by_name(frame_type)
            if not frame:
                return Response(
                    {'error': f'Frame type "{frame_type}" not found in FrameNet'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Return frame elements with flat structure
            elements_data = []
            for element in frame.elements:
                element_data = {
                    'id': element.id,
                    'name': element.name,
                    'core_type': element.core_type.lower(),
                    'definition': element.definition,
                    'fnid': element.name  # Use the element name as the FrameNet ID
                }
                elements_data.append(element_data)
            
            return Response({
                'frame_id': int(pk),
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
