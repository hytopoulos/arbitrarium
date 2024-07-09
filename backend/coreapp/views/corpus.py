from typing import Optional
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from coreapp.models import Environment
from coreapp.serializers import EnvironmentSerializer
import arb.util

class CorpusViewSet(ViewSet):
    def list(self, request: Request) -> Response:
        name: Optional[str] = request.query_params.get('name', None)
        if not name:
            return Response(status=400)
        q = arb.util.query_noun(name)
        return Response(q)
