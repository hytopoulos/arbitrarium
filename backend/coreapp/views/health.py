from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint that returns a 200 status code when the server is running.
    """
    return Response({"status": "healthy"}, status=status.HTTP_200_OK)
