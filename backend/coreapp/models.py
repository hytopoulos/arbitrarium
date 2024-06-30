import uuid
from django.db import models

class User(models.Model):
    id = models.BigAutoField(primary_key=True, editable=False)

class Entity(models.Model):
    id = models.BigAutoField(primary_key=True, editable=False)
    # the user I belong to
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # wordnet id
    wnid = models.IntegerField()
    # framenet id
    fnid = models.IntegerField()
