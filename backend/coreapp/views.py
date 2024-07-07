from django.db.models.manager import BaseManager
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from coreapp.models import User, Environment, Entity
from coreapp.serializers import UserSerializer, EnvironmentSerializer, EntitySerializer

@api_view(['GET'])
def hello_world(request):
    # print(request.data.get('email'))
    return Response({'message': str(request.data.get('email'))})

class EnvList(ListCreateAPIView):
    queryset: BaseManager[Environment] = Environment.objects.all()
    serializer_class = EnvironmentSerializer

class EnvDetail(RetrieveUpdateDestroyAPIView):
    queryset: BaseManager[Environment] = Environment.objects.all()
    serializer_class = EnvironmentSerializer

class UserList(ListCreateAPIView):
    queryset: BaseManager[User] = User.objects.all()
    serializer_class = UserSerializer

class UserDetail(RetrieveAPIView):
    queryset: BaseManager[User] = User.objects.all()
    serializer_class = UserSerializer

class EntityDetail(RetrieveUpdateDestroyAPIView):
    queryset: BaseManager[Entity] = Entity.objects.all()
    serializer_class = EntitySerializer

# class CurrentUser(APIView):
#     def get(self, request):
#         return Response({'message': 'user GET' })

#     def post(self, request):
#         return Response({'message': 'user POST' })
