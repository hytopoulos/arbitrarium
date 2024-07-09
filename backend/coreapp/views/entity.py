from typing import Optional
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from coreapp.models import Entity, Environment
from coreapp.serializers import EntitySerializer

class EntityViewSet(ModelViewSet):
    queryset: BaseManager[Entity] = Entity.objects.all()
    serializer_class = EntitySerializer

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

        envInstance = Environment.objects.get(id=env)
        userInstance = envInstance.user
        entity: Entity = Entity.objects.create(name=name, wnid=wnid, fnid=fnid, env=envInstance, user=userInstance)
        serializer = EntitySerializer(entity)
        return Response(serializer.data)

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
