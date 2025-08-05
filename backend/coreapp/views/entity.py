import logging
from typing import Optional
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from coreapp.models import Entity, Environment, Frame
from coreapp.serializers import EntitySerializer

logger = logging.getLogger(__name__)

class EntityViewSet(ModelViewSet):
    serializer_class = EntitySerializer
    queryset = Entity.objects.all()
    
    def get_queryset(self):
        return super().get_queryset().select_related('primary_frame').prefetch_related('primary_frame__elements')

    def create(self, request: Request) -> Response:
        name = request.data.get('name')
        wnid = request.data.get('wnid')
        fnid = request.data.get('fnid')
        env = request.data.get('env')

        if name is None:
            return Response({'error': 'name is required'}, status=400)
        if wnid is None:
            return Response({'error': 'wnid is required'}, status=400)
        if fnid is None:
            return Response({'error': 'fnid is required'}, status=400)
        if env is None:
            return Response({'error': 'env is required'}, status=400)

        env_instance = Environment.objects.get(id=env)
        user_instance = env_instance.user
        
        # instantiate primary frame
        primary_frame = Frame.from_lexical_unit_id(fnid)

        # Create the entity
        entity = Entity.objects.create(
            name=name, 
            wnid=wnid, 
            fnid=fnid, 
            env=env_instance, 
            user=user_instance,
            primary_frame=primary_frame
        )

        serializer = EntitySerializer(entity)
        return Response(serializer.data, status=201)

    def list(self, request: Request) -> Response:
        queryset: BaseManager[Entity] = Entity.objects.all()
        env: Optional[str] = request.query_params.get('env', None)
        if env is not None:
            queryset = queryset.filter(env=env)
        name: Optional[str] = request.query_params.get('name', None)
        if name is not None:
            queryset = queryset.filter(name=name)
        serializer = EntitySerializer(queryset, many=True)
        return Response(serializer.data)
