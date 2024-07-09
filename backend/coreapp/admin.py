from django.contrib import admin

from .models import User, Environment, Entity, Frame, Element

admin.site.register(User)
admin.site.register(Environment)
admin.site.register(Entity)
admin.site.register(Frame)
admin.site.register(Element)
