from django.urls import path

from . import views

urlpatterns = [
    path('hello-world/', views.hello_world, name='hello_world'),
    path('user/', user.CurrentUser.as_view(), name='current-user')
]
