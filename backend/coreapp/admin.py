from django.contrib import admin

from .models import User, Environment, Entity

admin.site.register(User)
admin.site.register(Environment)
admin.site.register(Entity)
