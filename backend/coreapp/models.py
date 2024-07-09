from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager


class User(AbstractUser):
    username = None
    email = models.EmailField(_("email address"), unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = CustomUserManager()


class Environment(models.Model):
    # the user I belong to
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="environments")
    # the name of the environment
    name = models.CharField(max_length=255)
    # the description of the environment
    description = models.TextField(null=True, blank=True)
    # the date I was created
    created_at = models.DateTimeField(null=True)
    # the date I was updated
    updated_at = models.DateTimeField(null=True)


class Entity(models.Model):
    # the user I belong to
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="entities")
    # environment I belong to
    env = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name="entities")
    # name
    name = models.CharField(max_length=255, default='Entity')
    # wordnet id
    wnid = models.IntegerField(null=True)
    # framenet id
    fnid = models.IntegerField(null=True)
    # the date I was created
    created_at = models.DateTimeField(null=True, blank=True)
    # the date I was updated
    updated_at = models.DateTimeField(null=True, blank=True)

class Frame(models.Model):
    # the entity I belong to
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="frames")
    # framenet id
    fnid = models.IntegerField(null=True)


class Element(models.Model):
    # the frame I belong to
    frame = models.ForeignKey(Frame, on_delete=models.CASCADE, related_name="elements")
    # framenet id
    fnid = models.IntegerField(null=True)
    # the value
    value = models.BinaryField(null=True)
