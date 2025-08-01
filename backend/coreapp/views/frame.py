from typing import Optional, List, Dict, Any
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
from rest_framework.request import Request
from django.db import transaction
from coreapp.models import Frame, Entity
from coreapp.serializers import FrameSerializer
from coreapp.services.frame_suggestor import FrameSuggestor
from django.core.cache import cache
from typing import List, Dict, Any, Optional

class FrameViewSet(ModelViewSet):
    queryset: BaseManager[Frame] = Frame.objects.all()
    serializer_class = FrameSerializer

    def create(self, request: Request) -> Response:
        entity_id = request.data.get('entity')
        fnid = request.data.get('fnid')
        name = request.data.get('name', '')
        definition = request.data.get('definition', '')
        is_primary = request.data.get('is_primary', False)

        if entity_id is None:
            return Response({'error': 'entity is required'}, status=400)
        if fnid is None:
            return Response({'error': 'fnid is required'}, status=400)

        try:
            entity = Entity.objects.get(id=entity_id)
            
            # If this is being set as primary, unset any existing primary frame for this entity
            if is_primary:
                Frame.objects.filter(entity=entity, is_primary=True).update(is_primary=False)
            
            frame = Frame.objects.create(
                entity=entity,
                fnid=fnid,
                name=name,
                definition=definition,
                is_primary=is_primary
            )
            
            serializer = FrameSerializer(frame)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Entity.DoesNotExist:
            return Response({'error': 'Entity not found'}, status=404)

    def list(self, request: Request) -> Response:
        queryset = self.queryset
        
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

    def update(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        is_primary = request.data.get('is_primary')
        
        # If this frame is being set as primary, unset any existing primary frame for this entity
        if is_primary is True and not instance.is_primary:
            Frame.objects.filter(entity=instance.entity, is_primary=True).update(is_primary=False)
        
        # Clear the cache for frame suggestions for this entity
        cache_key = FrameSuggestor.get_cache_key(instance.entity_id, 5)  # Default limit
        cache.delete(cache_key)
            
        return super().update(request, *args, **kwargs)
        
    def destroy(self, request: Request, *args, **kwargs) -> Response:
        # Get the instance before deletion to access its entity_id
        instance = self.get_object()
        entity_id = instance.entity_id
        
        # Clear the cache for frame suggestions for this entity
        cache_key = FrameSuggestor.get_cache_key(entity_id, 5)  # Default limit
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
                    cache_key = FrameSuggestor.get_cache_key(entity_id, 5)
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
                    cache_key = FrameSuggestor.get_cache_key(entity_id, 5)
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
            entity = Entity.objects.get(id=entity_id)
            
            # Get suggested frames from the FrameSuggestor service
            suggested_frames = FrameSuggestor.suggest_frames(entity, limit=limit)
            
            # Get existing frames for this entity to avoid suggesting duplicates
            existing_frames = set(Frame.objects.filter(entity=entity).values_list('fnid', flat=True))
            
            # Filter out frames that already exist for this entity
            unique_suggestions = [
                frame for frame in suggested_frames 
                if frame['fnid'] not in existing_frames
            ]
            
            # Add a flag to indicate if the frame already exists for the entity
            for frame in unique_suggestions:
                frame['already_added'] = frame['fnid'] in existing_frames
            
            return Response(unique_suggestions)
            
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
