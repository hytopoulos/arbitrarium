from typing import Optional
from django.db.models.manager import BaseManager
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.response import Response
from coreapp.models import User
from coreapp.serializers import UserSerializer

class UserViewSet(ModelViewSet):
    queryset: BaseManager[User] = User.objects.all()
    serializer_class = UserSerializer
