from django.urls import path, include
from django.urls.resolvers import URLPattern

from . import views

urlpatterns: list[URLPattern] = [
    path(route='hello-world/', view=views.hello_world),
    path(route='profile/', view=views.UserList.as_view()),
    path(route='profile/<int:pk>/', view=views.UserDetail.as_view()),
    path(route='env/', view=views.EnvList.as_view()),
    path(route='env/<int:pk>', view=views.EnvDetail.as_view()),
    path(route='ent/<int:pk>', view=views.EntityDetail.as_view()),
    ]

urlpatterns += [
    path('api-auth/', include('rest_framework.urls')),
]
