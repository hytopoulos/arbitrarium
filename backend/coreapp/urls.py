from django.urls import path, include
from django.urls.resolvers import URLPattern
from rest_framework.routers import DefaultRouter
from .views import auth

urlpatterns: list[URLPattern] = [
    path(route='auth/', view=auth.get_csrf),
]

## User API routes
from .views import user
user_router = DefaultRouter()
user_router.register(r'profile', user.UserViewSet)
urlpatterns += [path(route='', view=include(user_router.urls))]

## Environment API routes
from .views import environment
environment_router = DefaultRouter()
environment_router.register(r'env', environment.EnvViewSet)
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
