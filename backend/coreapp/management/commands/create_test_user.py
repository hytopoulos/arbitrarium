from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates a test user and returns an authentication token'

    def handle(self, *args, **options):
        # Check if test user already exists
        email = 'test@example.com'
        password = 'testpass123'
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'is_active': True,
                'is_staff': False,
                'is_superuser': False
            }
        )
        
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully created test user: {email}'))
        else:
            self.stdout.write(self.style.WARNING(f'Test user {email} already exists'))
        
        # Get or create token for the user
        token, created = Token.objects.get_or_create(user=user)
        
        self.stdout.write(self.style.SUCCESS('Test user credentials:'))
        self.stdout.write(self.style.SUCCESS(f'Email: {email}'))
        self.stdout.write(self.style.SUCCESS(f'Password: {password}'))
        self.stdout.write(self.style.SUCCESS(f'Token: {token.key}'))
        self.stdout.write(self.style.SUCCESS('\nUse this token in the Authorization header: Token <token>'))
