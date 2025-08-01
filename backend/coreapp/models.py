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
    """
    Represents a FrameNet frame associated with an entity.
    An entity can have multiple frames, with one marked as primary.
    """
    # the entity I belong to
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="frames")
    # framenet id
    fnid = models.IntegerField(null=True)
    # Frame name from FrameNet
    name = models.CharField(max_length=255, blank=True)
    # Frame definition
    definition = models.TextField(null=True, blank=True)
    # Whether this is the primary frame for the entity
    is_primary = models.BooleanField(default=False)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', 'name']
        indexes = [
            models.Index(fields=['entity', 'is_primary']),
            models.Index(fields=['fnid']),
        ]

    def save(self, *args, **kwargs):
        # If this frame is being set as primary, demote any existing primary frames for this entity
        if self.is_primary:
            # Use update() with F() to avoid race conditions
            Frame.objects.filter(
                entity=self.entity,
                is_primary=True
            ).exclude(pk=self.pk if self.pk else None).update(is_primary=False)
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name or 'Unnamed Frame'} (ID: {self.fnid or 'N/A'})"


class Element(models.Model):
    """
    Represents a FrameNet frame element (role) with its value.
    """
    # Core type choices
    CORE = 'core'
    CORE_UNEXPRESSED = 'core_ue'
    PERIPHERAL = 'peripheral'
    EXTRA_THEMATIC = 'extra_thematic'
    
    CORE_TYPE_CHOICES = [
        (CORE, 'Core'),
        (CORE_UNEXPRESSED, 'Core-Unexpressed'),
        (PERIPHERAL, 'Peripheral'),
        (EXTRA_THEMATIC, 'Extra-Thematic'),
    ]
    
    # the frame I belong to
    frame = models.ForeignKey(Frame, on_delete=models.CASCADE, related_name="elements")
    # framenet id
    fnid = models.IntegerField(null=True)
    # Element name from FrameNet
    name = models.CharField(max_length=255, blank=True)
    # Core type (Core, Core-Unexpressed, etc.)
    core_type = models.CharField(
        max_length=20,
        choices=CORE_TYPE_CHOICES,
        default=CORE
    )
    # Element definition
    definition = models.TextField(null=True, blank=True)
    # Flexible value storage (can store different types of values)
    value = models.JSONField(null=True, blank=True)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['core_type', 'name']
        indexes = [
            models.Index(fields=['frame', 'core_type']),
            models.Index(fields=['fnid']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_core_type_display()})"
