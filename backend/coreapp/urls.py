from django.urls import path, include
from django.urls.resolvers import URLPattern
from rest_framework.routers import DefaultRouter
from .views import auth

urlpatterns: list[URLPattern] = [
    path('auth/csrf/', auth.get_csrf, name='get_csrf'),
    path('auth/token/', auth.obtain_auth_token, name='obtain_token'),
    path('auth/validate/', auth.validate_token, name='validate_token'),
    path('auth/user/', auth.current_user, name='current_user'),  # Frontend expects this endpoint
]

## User API routes
from .views import user
user_router = DefaultRouter()
user_router.register(r'profile', user.UserViewSet)
urlpatterns += [path(route='', view=include(user_router.urls))]

## Environment API routes
from .views import environment
environment_router = DefaultRouter()
environment_router.register(r'env', environment.EnvViewSet, basename='environment')
urlpatterns += [path(route='', view=include(environment_router.urls))]

## Entity API routes
from .views import entity
entity_router = DefaultRouter()
entity_router.register(r'ent', entity.EntityViewSet)
urlpatterns += [path(route='', view=include(entity_router.urls))]

## Corpus API routes
from .views import corpus
corpus_router = DefaultRouter()
corpus_router.register(r'corp', corpus.CorpusViewSet, basename='corpus')
urlpatterns += [path(route='', view=include(corpus_router.urls))]

## Frame API routes
from .views import frame
frame_router = DefaultRouter()
frame_router.register(r'frame', frame.FrameViewSet, basename='frame')
urlpatterns += [path(route='', view=include(frame_router.urls))]

## Element API routes
from .views import element
element_router = DefaultRouter()
element_router.register(r'element', element.ElementViewSet, basename='element')
urlpatterns += [path(route='', view=include(element_router.urls))]
