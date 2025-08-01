from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from coreapp.models import Environment

User = get_user_model()

@api_view(['GET'])
@ensure_csrf_cookie
def get_csrf(request: Request) -> Response:
    return Response({'success': 'CSRF cookie set'})

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def obtain_auth_token(request: Request) -> Response:
    """
    User login and token generation endpoint.
    Expected POST data: { "username": "...", "password": "..." }
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Please provide both username and password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Authenticate user
    user = authenticate(username=username, password=password)
    
    if user is not None:
        if user.is_active:
            # Get or create token for the user
            token, created = Token.objects.get_or_create(user=user)
            
            # Ensure user has at least one environment
            if not Environment.objects.filter(user=user).exists():
                # Create a default environment for the user
                default_env = Environment.objects.create(
                    user=user,
                    name='Default Environment',
                    description='Automatically created default environment',
                    created_at=timezone.now(),
                    updated_at=timezone.now()
                )
                print(f"Created default environment {default_env.id} for user {user.email}")
            
            # Log the user in (optional, for session auth)
            login(request, user)
            
            # Get the user's first environment (should exist now)
            user_environment = Environment.objects.filter(user=user).first()
            
            return Response({
                'token': token.key,
                'user_id': user.pk,
                'email': user.email,
                'username': user.username,
                'environment_id': user_environment.id if user_environment else None
            })
        else:
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
    else:
        return Response(
            {'error': 'Invalid username or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def validate_token(request: Request) -> Response:
    """
    Validate an existing token and return user info.
    Requires token authentication.
    """
    return Response({
        'user_id': request.user.pk,
        'username': request.user.username,
        'email': request.user.email,
        'is_staff': request.user.is_staff,
        'is_superuser': request.user.is_superuser
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def current_user(request: Request) -> Response:
    """
    Get current user information.
    This endpoint is used by the frontend to get the logged-in user's details.
    """
    return Response({
        'id': request.user.pk,
        'username': request.user.username,
        'email': request.user.email,
        'is_staff': request.user.is_staff,
        'is_superuser': request.user.is_superuser
    })
