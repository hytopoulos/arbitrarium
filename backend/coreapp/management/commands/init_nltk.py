"""
Management command to initialize NLTK data.

This command ensures all required NLTK data is downloaded and available
for the lexical services.
"""
import nltk
import os
from django.conf import settings
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Initialize NLTK data for lexical services'
    
    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(self.style.SUCCESS('Initializing NLTK data...'))
        
        # Set NLTK data path if configured
        nltk_data_path = settings.LEXICAL_SERVICES.get('nltk_data_path')
        if nltk_data_path:
            os.environ['NLTK_DATA'] = nltk_data_path
            self.stdout.write(f'Using NLTK data path: {nltk_data_path}')
        
        # Import the required NLTK data packages from the wrappers
        from arb.nltk_impl.wordnet_wrapper import REQUIRED_NLTK_DATA as WORDNET_DATA
        from arb.nltk_impl.framenet_wrapper import REQUIRED_NLTK_DATA as FRAMENET_DATA
        
        # Combine and deduplicate the required packages
        required_data = list(set(WORDNET_DATA + FRAMENET_DATA))
        
        # Add any additional NLTK data that might be needed by other components
        additional_data = [
            # Add any additional NLTK data packages here if needed
        ]
        
        required_data = list(set(required_data + additional_data))
        
        for data in required_data:
            try:
                self.stdout.write(f'Downloading {data}... ', ending='')
                nltk.download(data, quiet=True)
                self.stdout.write(self.style.SUCCESS('OK'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Failed to download {data}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS('NLTK data initialization complete'))
