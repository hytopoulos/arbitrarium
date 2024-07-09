from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

@api_view(['GET'])
@ensure_csrf_cookie
def get_csrf(request: Request) -> Response:
    return Response({'success': 'CSRF cookie set'})
