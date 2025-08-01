from typing import Optional, List
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from coreapp.models import Environment
from coreapp.serializers import EnvironmentSerializer

class EnvViewSet(ModelViewSet):
    serializer_class = EnvironmentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    
    def get_queryset(self):
        """
        Return environments belonging to the current user.
        """
        return Environment.objects.filter(user=self.request.user).order_by('-created_at')
    
    def list(self, request: Request, *args, **kwargs):
        """
        List all environments for the current user.
        """
        try:
            print(f"User {request.user.email} is requesting environments")
            queryset = self.filter_queryset(self.get_queryset())
            print(f"Found {queryset.count()} environments for user {request.user.email}")
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error in environments list: {error_trace}")
            return Response(
                {
                    'error': 'Failed to load environments',
                    'detail': str(e),
                    'trace': error_trace if settings.DEBUG else None
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        """
        Set the current user as the owner of new environments.
        """
        serializer.save(user=self.request.user)
