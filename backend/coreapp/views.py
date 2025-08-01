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
