from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    pass

class Entity(models.Model):
    # the user I belong to
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # wordnet id
    wnid = models.IntegerField()
    # framenet id
    fnid = models.IntegerField()
