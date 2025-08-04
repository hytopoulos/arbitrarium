from mysite.settings import *

# Use a faster password hasher for testing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Use PostgreSQL for tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'arb_test',
        'USER': 'arb',
        'PASSWORD': 'arb',
        'HOST': 'postgres',
        'PORT': '5432',
    }
}

# Enable migrations for tests
MIGRATION_MODULES = {}

# Disable caching for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Disable logging during tests
import logging
logging.disable(logging.CRITICAL)

# Use a simpler password validation for tests
AUTH_PASSWORD_VALIDATORS = []

# Use a faster test runner
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# Disable debug toolbar for tests
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: False,
}

# Disable throttling for tests
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'TEST_REQUEST_DEFAULT_FORMAT': 'json'
}
