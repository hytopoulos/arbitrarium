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
@permission_classes([AllowAny])
@authentication_classes([])
@ensure_csrf_cookie
def get_csrf(request: Request) -> Response:
    return Response({'success': 'CSRF cookie set'})

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def obtain_auth_token(request: Request) -> Response:
    """
    User login and token generation endpoint.
    Expected POST data: { "email": "...", "password": "..." }
    """
    print(f"[AUTH] Login attempt - Headers: {request.headers}")
    print(f"[AUTH] Login attempt - Data: {request.data}")
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        print("[AUTH] Missing email or password in request")
        return Response(
            {'error': 'Please provide both email and password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    print(f"[AUTH] Attempting to authenticate user: {email}")
    
    try:
        # First, try to get the user by email
        try:
            user = User.objects.get(email=email)
            print(f"[AUTH] Found user: {user.email}")
            
            # Then authenticate with the provided password
            authenticated_user = authenticate(username=user.email, password=password)
            if not authenticated_user:
                print(f"[AUTH] Authentication failed for user: {email}")
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            user = authenticated_user
            
        except User.DoesNotExist:
            print(f"[AUTH] User not found with email: {email}")
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            print(f"[AUTH] User account is disabled: {email}")
            return Response(
                {'error': 'User account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get or create token for the user
        token, created = Token.objects.get_or_create(user=user)
        print(f"[AUTH] {'Created new' if created else 'Using existing'} token for user: {user.email}")
        
        # Ensure user has at least one environment
        user_environment = Environment.objects.filter(user=user).first()
        if not user_environment:
            try:
                # Try to create a default environment for the user
                user_environment = Environment.objects.create(
                    user=user,
                    name='Default Environment',
                    description='Automatically created default environment',
                    created_at=timezone.now(),
                    updated_at=timezone.now()
                )
                print(f"[AUTH] Created default environment {user_environment.id} for user {user.email}")
            except Exception as e:
                print(f"[AUTH] Error creating default environment: {e}")
                # If creating default environment fails, just get the first environment for the user
                user_environment = Environment.objects.filter(user=user).first()
                if user_environment:
                    print(f"[AUTH] Using existing environment {user_environment.id} for user {user.email}")
        
        # Log the user in (for session auth)
        login(request, user)
        print(f"[AUTH] Successfully logged in user: {user.email}")
        
        response_data = {
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username,
            'environment_id': user_environment.id if user_environment else None
        }
        print(f"[AUTH] Sending response: {response_data}")
        
        return Response(response_data)
        
    except Exception as e:
        print(f"[AUTH] Unexpected error during authentication: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'An error occurred during authentication'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
