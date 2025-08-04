"""
Lexical Services Integration

This module provides integration between Django and the lexical services
(NLTK-based WordNet and FrameNet implementations). It implements the
service locator pattern to provide easy access to lexical services
throughout the Django application.
"""
import importlib
from typing import Any, Dict, Optional, Type, TypeVar
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

# Import the service interfaces for type checking
from arb.interfaces.wordnet_service import IWordNetService
from arb.interfaces.framenet_service import IFrameNetService

# Type variable for service types
T = TypeVar('T')

class LexicalServiceError(Exception):
    """Base exception for lexical service errors."""
    pass


class ServiceLocator:
    """
    Service locator for lexical services.
    
    This class provides a central registry for all lexical services
    and handles their initialization and retrieval.
    """
    _services: Dict[str, Any] = {}
    _initialized = False
    
    @classmethod
    def _initialize_services(cls) -> None:
        """Initialize all configured services."""
        if cls._initialized:
            return
            
        # Get service configurations from Django settings
        service_configs = getattr(settings, 'LEXICAL_SERVICES', {})
        
        # Default configurations if not specified in settings
        default_configs = {
            'wordnet': 'arb.nltk_impl.wordnet_wrapper.NLTKWordNetService',
            'framenet': 'arb.nltk_impl.framenet_wrapper.NLTKFrameNetService',
        }
        
        # Initialize each service
        for service_name, default_impl in default_configs.items():
            # Get the implementation class path from settings or use default
            impl_path = service_configs.get(service_name, default_impl)
            
            try:
                # Import the module and get the class
                module_path, class_name = impl_path.rsplit('.', 1)
                module = importlib.import_module(module_path)
                service_class = getattr(module, class_name)
                
                # Create and store the service instance
                cls._services[service_name] = service_class()
                
            except (ImportError, AttributeError) as e:
                raise ImproperlyConfigured(
                    f"Could not initialize {service_name} service: {str(e)}"
                )
        
        cls._initialized = True
    
    @classmethod
    def get_service(cls, service_name: str, service_type: Type[T]) -> T:
        """
        Get a service by name and type.
        
        Args:
            service_name: Name of the service to retrieve
            service_type: Expected service interface/type
            
        Returns:
            The requested service instance
            
        Raises:
            LexicalServiceError: If the service is not found or has the wrong type
        """
        # Ensure services are initialized
        cls._initialize_services()
        
        # Get the service
        service = cls._services.get(service_name)
        if service is None:
            raise LexicalServiceError(f"No service registered with name: {service_name}")
        
        # Verify the service implements the expected interface
        if not isinstance(service, service_type):
            raise LexicalServiceError(
                f"Service {service_name} does not implement {service_type.__name__}"
            )
        
        return service
    
    @classmethod
    def get_wordnet_service(cls) -> IWordNetService:
        """Get the WordNet service instance."""
        return cls.get_service('wordnet', IWordNetService)
    
    @classmethod
    def get_framenet_service(cls) -> IFrameNetService:
        """Get the FrameNet service instance."""
        return cls.get_service('framenet', IFrameNetService)


# Convenience functions for direct service access
def get_wordnet_service() -> IWordNetService:
    """Get the WordNet service instance."""
    return ServiceLocator.get_wordnet_service()

def get_framenet_service() -> IFrameNetService:
    """Get the FrameNet service instance."""
    return ServiceLocator.get_framenet_service()
