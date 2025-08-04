import logging
from typing import Optional, List, Dict, Any
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status, filters, permissions
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q
from coreapp.models import Frame, Entity, Element
from coreapp.serializers import FrameSerializer, ElementSerializer
from coreapp.services.frame_application import FrameApplicator
from coreapp.services.frame_suggestion import FrameSuggestionService
from coreapp.models import Environment, Entity
from django.core.cache import cache
from django.conf import settings

# Set up logging
logger = logging.getLogger(__name__)

class FrameViewSet(ModelViewSet):
    """
    API endpoint that allows frames to be viewed or edited.
    """
    queryset: BaseManager[Frame] = Frame.objects.all()
    serializer_class = FrameSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['fnid', 'definition']
    ordering_fields = ['fnid', 'created_at', 'updated_at', 'is_primary']
    ordering = ['-is_primary', 'fnid']
    
    # Explicitly set authentication and permission classes
    # to ensure they can be overridden in tests
    authentication_classes = []
    permission_classes = []
    
    def get_queryset(self):
        """
        Optionally filter by entity_id if provided in the query parameters.
        """
        queryset = super().get_queryset()
        entity_id = self.request.query_params.get('entity_id')
        if entity_id is not None:
            queryset = queryset.filter(entity_id=entity_id)
        return queryset
        
    @action(detail=False, methods=['post'], url_path='suggest-frames')
    def suggest_frames(self, request):
        """
        Suggest frames based on a list of FrameNet IDs.
        
        Expected request body:
        {
            "framenet_ids": ["Person", "Item"],
            "environment_id": 123  # Optional
        }
        """
        framenet_ids = request.data.get('framenet_ids', [])
        environment_id = request.data.get('environment_id')
        
        if not framenet_ids or not isinstance(framenet_ids, list):
            return Response(
                {"error": "framenet_ids is required and must be a list"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialize the frame suggestion service
            suggestion_service = FrameSuggestionService()
            
            # Get frame suggestions
            suggestions = suggestion_service.suggest_frames(
                framenet_ids=framenet_ids,
                environment_id=environment_id
            )
            
            return Response({
                "suggested_frames": suggestions,
                "input": {
                    "framenet_ids": framenet_ids,
                    "environment_id": environment_id
                }
            })
            
        except Exception as e:
            logger.error(f"Error suggesting frames: {str(e)}")
            return Response(
                {"error": "An error occurred while suggesting frames"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request: Request) -> Response:
        """
        Create a new frame instance.
        If is_primary is True, any existing primary frame for the entity will be demoted.
        """
        entity_id = request.data.get('entity')
        if not entity_id:
            return Response(
                {'error': 'entity is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            entity = Entity.objects.get(id=entity_id)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Handle primary frame logic
            is_primary = serializer.validated_data.get('is_primary', False)
            if is_primary:
                Frame.objects.filter(entity=entity, is_primary=True).update(is_primary=False)
                
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data, 
                status=status.HTTP_201_CREATED, 
                headers=headers
            )
        except Entity.DoesNotExist:
            return Response(
                {'error': 'Entity not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request: Request) -> Response:
        """
        Search for frames by name or definition.
        
        Query Parameters:
            q: Search query string
            entity_id: Optional filter by entity ID
            
        Returns:
            List of matching frames
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply search filter if query parameter is provided
        search_query = request.query_params.get('q')
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) | 
                Q(definition__icontains=search_query)
            )
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='elements')
    def elements(self, request: Request, pk=None) -> Response:
        """
        List all elements for a specific frame.
        
        Returns:
            List of elements for the specified frame
        """
        frame = self.get_object()
        elements = frame.elements.all()
        serializer = ElementSerializer(elements, many=True)
        return Response(serializer.data)

    def list(self, request: Request) -> Response:
        """List all frames, optionally filtered by entity_id."""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter by entity if provided
        entity_id = request.query_params.get('entity')
        if entity_id is not None:
            queryset = queryset.filter(entity_id=entity_id)
            
        # Filter by frame name if provided
        name = request.query_params.get('name')
        if name is not None:
            queryset = queryset.filter(name__icontains=name)
            
        # Filter by primary status if provided
        is_primary = request.query_params.get('is_primary')
        if is_primary is not None:
            queryset = queryset.filter(is_primary=is_primary.lower() == 'true')
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['post'], url_path='set-primary', url_name='frame-set-primary')
    def set_primary(self, request: Request, pk=None) -> Response:
        """
        Set this frame as the primary frame for its entity.
        This will automatically demote any other primary frames for the entity.
        """
        frame = self.get_object()
        
        with transaction.atomic():
            # Demote any existing primary frames for this entity
            Frame.objects.filter(
                entity=frame.entity,
                is_primary=True
            ).exclude(pk=frame.pk).update(is_primary=False)
            
            # Set this frame as primary
            frame.is_primary = True
            frame.save(update_fields=['is_primary', 'updated_at'])
            
            # Clear the cache for frame suggestions for this entity using consistent key format
            cache_key = f"frame_suggestions:{frame.entity_id}:5"  # Default limit of 5
            cache.delete(cache_key)
        
        return Response(
            {'status': 'frame set as primary'},
            status=status.HTTP_200_OK
        )

    def update(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        is_primary = request.data.get('is_primary')
        
        # If this frame is being set as primary, unset any existing primary frame for this entity
        if is_primary is True and not instance.is_primary:
            Frame.objects.filter(entity=instance.entity, is_primary=True).update(is_primary=False)
        
        # Clear the cache for frame suggestions for this entity
        cache_key = f"frame_suggestions:{instance.entity_id}:5"
        cache.delete(cache_key)
            
        return super().update(request, *args, **kwargs)
        
    def destroy(self, request: Request, *args, **kwargs) -> Response:
        # Get the instance before deletion to access its entity_id
        instance = self.get_object()
        entity_id = instance.entity_id
        
        # Clear the cache for frame suggestions for this entity
        cache_key = f"frame_suggestions:{entity_id}:5"
        cache.delete(cache_key)
        
        return super().destroy(request, *args, **kwargs)
        
    @action(detail=False, methods=['post'])
    def bulk_create(self, request: Request) -> Response:
        """
        Bulk create multiple frames at once.
        
        Request body should be a list of frame objects to create.
        Example: [{"entity": 1, "fnid": "fn123", "name": "Example Frame", ...}, ...]
        """
        data = request.data
        print(f"Bulk create data: {data}")  # Debug log
        
        if not isinstance(data, list):
            return Response(
                {'error': 'Expected a list of frames'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = self.get_serializer(data=data, many=True)
        if not serializer.is_valid():
            print(f"Serializer errors: {serializer.errors}")  # Debug log
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                instances = serializer.save()
                
                # Clear cache for all affected entities
                entity_ids = {frame.entity_id for frame in instances}
                for entity_id in entity_ids:
                    cache_key = f"frame_suggestions:{entity_id}:5"
                    cache.delete(cache_key)
                    
            return Response(
                self.get_serializer(instances, many=True).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {'error': f'Error creating frames: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['put'])
    def bulk_update(self, request: Request) -> Response:
        """
        Bulk update multiple frames at once.
        
        Request body should be a list of frame objects to update.
        Each object must contain an 'id' field.
        Example: [{"id": 1, "name": "Updated Name", ...}, ...]
        """
        data = request.data
        if not isinstance(data, list):
            return Response(
                {'error': 'Expected a list of frames'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate all frame IDs exist
        frame_ids = [item.get('id') for item in data if 'id' in item]
        existing_frames = {frame.id: frame for frame in Frame.objects.filter(id__in=frame_ids)}
        
        if len(existing_frames) != len(frame_ids):
            missing_ids = set(frame_ids) - set(existing_frames.keys())
            return Response(
                {'error': f'Frames not found: {missing_ids}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update each frame
        updated_frames = []
        entity_ids = set()
        
        try:
            with transaction.atomic():
                for item in data:
                    frame_id = item.pop('id')
                    frame = existing_frames[frame_id]
                    
                    # Handle is_primary flag
                    is_primary = item.get('is_primary')
                    if is_primary is True and not frame.is_primary:
                        # Unset any existing primary frame for this entity
                        Frame.objects.filter(
                            entity=frame.entity, 
                            is_primary=True
                        ).update(is_primary=False)
                    
                    # Update frame fields
                    for attr, value in item.items():
                        setattr(frame, attr, value)
                    frame.save()
                    updated_frames.append(frame)
                    entity_ids.add(frame.entity_id)
                
                # Clear cache for all affected entities
                for entity_id in entity_ids:
                    cache_key = f"frame_suggestions:{entity_id}:5"
                    cache.delete(cache_key)
                
                return Response(
                    self.get_serializer(updated_frames, many=True).data,
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            return Response(
                {'error': f'Error updating frames: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def suggest(self, request: Request) -> Response:
        """
        Suggest frames for an entity based on its WordNet synset and FrameNet relations.
        
        Query Parameters:
            entity_id: ID of the entity to suggest frames for
            limit: Maximum number of suggestions to return (default: 5)
            
        Returns:
            List of suggested frames with relevance scores
        """
        entity_id = request.query_params.get('entity_id')
        limit = int(request.query_params.get('limit', 5))
        
        if not entity_id:
            return Response(
                {'error': 'entity_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the entity
            entity = Entity.objects.get(id=entity_id)
            
            # Get the environment for this entity
            environment = entity.env
            
            # Get frame suggestions using FrameApplicator
            frame_applicator = FrameApplicator(environment)
            entities = [entity]
            context = {'request': request}  # Add any additional context needed
            
            # Get potential frames
            potential_frames = frame_applicator.find_applicable_frames(entities, context)
            
            # Format the response to match the expected format
            suggestions = []
            for frame_match in potential_frames[:limit]:
                frame = frame_match.frame
                suggestions.append({
                    'fnid': frame.fnid if hasattr(frame, 'fnid') else None,
                    'name': frame.name,
                    'definition': getattr(frame, 'definition', ''),
                    'score': frame_match.score,
                    'match_type': 'semantic',  # Default match type
                    'lex_unit': getattr(frame, 'lex_unit', None),
                    'role_assignments': {}
                })
            
            return Response(suggestions)
            
        except Entity.DoesNotExist:
            return Response(
                {'error': 'Entity not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error suggesting frames: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
