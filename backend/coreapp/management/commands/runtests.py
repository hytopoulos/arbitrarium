from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
import sys

class Command(BaseCommand):
    help = 'Run tests with proper environment setup'

    def handle(self, *args, **options):
        # Set test environment variable
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'
        
        # Run migrations
        self.stdout.write(self.style.SUCCESS('Running migrations...'))
        call_command('migrate', '--noinput')
        
        # Run tests with the test settings
        self.stdout.write(self.style.SUCCESS('Running tests...'))
        test_result = call_command('test', 'coreapp.tests.test_frame_applicator', '--noinput', '--verbosity=2')
        
        # Exit with the test result code
        sys.exit(test_result)
