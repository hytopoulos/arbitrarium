from typing import Optional
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from coreapp.models import Environment
from coreapp.serializers import EnvironmentSerializer

class EnvViewSet(ModelViewSet):
    queryset: BaseManager[Environment] = Environment.objects.all()
    serializer_class = EnvironmentSerializer
