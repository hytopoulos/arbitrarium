from typing import Optional
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from coreapp.models import Element, Frame
from coreapp.serializers import ElementSerializer

class ElementViewSet(ModelViewSet):
    queryset: BaseManager[Element] = Element.objects.all()
    serializer_class = ElementSerializer

    def create(self, request: Request) -> Response:
        frame_id = request.data.get('frame')
        fnid = request.data.get('fnid')
        name = request.data.get('name', '')
        core_type = request.data.get('core_type', 'core')
        definition = request.data.get('definition', '')
        value = request.data.get('value', {})

        if frame_id is None:
            return Response({'error': 'frame is required'}, status=400)
        if fnid is None:
            return Response({'error': 'fnid is required'}, status=400)

        try:
            frame = Frame.objects.get(id=frame_id)
            element = Element.objects.create(
                frame=frame,
                fnid=fnid,
                name=name,
                core_type=core_type,
                definition=definition,
                value=value
            )
            
            serializer = ElementSerializer(element)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Frame.DoesNotExist:
            return Response({'error': 'Frame not found'}, status=404)

    def list(self, request: Request) -> Response:
        queryset = self.queryset
        
        # Filter by frame if provided
        frame_id = request.query_params.get('frame')
        if frame_id is not None:
            queryset = queryset.filter(frame_id=frame_id)
            
        # Filter by element name if provided
        name = request.query_params.get('name')
        if name is not None:
            queryset = queryset.filter(name__icontains=name)
            
        # Filter by core type if provided
        core_type = request.query_params.get('core_type')
        if core_type is not None:
            queryset = queryset.filter(core_type=core_type)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
