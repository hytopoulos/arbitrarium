from django.contrib import admin
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import HttpRequest, HttpResponseRedirect
from django.urls import reverse
from django.utils.html import format_html
from django.utils.translation import ngettext

from .models import User, Environment, Entity, Frame, Element
from .services.framenet.framenet_service import FrameNetService
from .services.frame_suggestion import FrameSuggestionService


class FrameAdmin(admin.ModelAdmin):
    list_display = ('name', 'fnid', 'entity_link', 'is_primary', 'suggest_frames_link')
    list_filter = ('is_primary', 'created_at')
    search_fields = ('name', 'definition', 'entity__name')
    readonly_fields = ('created_at', 'updated_at')
    
    def entity_link(self, obj):
        if obj.entity:
            url = reverse('admin:coreapp_entity_change', args=[obj.entity.id])
            return format_html('<a href="{}">{}</a>', url, obj.entity.name)
        return "-"
    entity_link.short_description = 'Entity'
    entity_link.admin_order_field = 'entity__name'
    
    def suggest_frames_link(self, obj):
        if obj.entity:
            url = reverse('admin:frame-frame-suggestions', args=[obj.entity.id])
            return format_html('<a href="{}" class="button">Suggest Frames</a>', url)
        return "-"
    suggest_frames_link.short_description = 'Suggestions'
    suggest_frames_link.allow_tags = True
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:entity_id>/suggestions/',
                self.admin_site.admin_view(self.frame_suggestions_view),
                name='frame-frame-suggestions',
            ),
        ]
        return custom_urls + urls
    
    def frame_suggestions_view(self, request: HttpRequest, entity_id: int):
        """View for displaying frame suggestions for an entity."""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            entity = Entity.objects.get(id=entity_id)
            logger.info(f"Processing frame suggestions for entity: {entity.name} (ID: {entity.id}, FrameNet ID: {entity.fnid})")
            
            # Get frame suggestions using the FrameNet service
            from .services.framenet.framenet_service import FrameNetService
            from .services.frame_suggestion import FrameSuggestionService
            
            frame_net = FrameNetService()
            suggestion_service = FrameSuggestionService(frame_net)
            
            # Get the entity's FrameNet ID if available
            suggestions = []
            if entity.fnid:
                logger.info(f"Getting suggestions for FrameNet ID: {entity.fnid}")
                # Get suggestions based on the entity's FrameNet ID
                # The suggest_frames method expects a list of FrameNet IDs as strings
                raw_suggestions = suggestion_service.suggest_frames([str(entity.fnid)])
                
                # Process suggestions to match the expected template format
                for suggestion in raw_suggestions:
                    # Handle both direct frame suggestions and suggestions with frame data
                    if isinstance(suggestion, dict) and 'frame' in suggestion:
                        # This is a suggestion with detailed frame data
                        frame_data = suggestion['frame']
                        suggestions.append({
                            'name': frame_data.get('name', 'Unknown Frame'),
                            'fnid': frame_data.get('id', frame_data.get('fnid', '')),
                            'definition': frame_data.get('definition', ''),
                            'score': suggestion.get('score', 0),
                            'elements': []  # TODO: Add elements if needed
                        })
                    elif isinstance(suggestion, dict):
                        # This is a direct frame suggestion
                        suggestions.append({
                            'name': suggestion.get('name', 'Unknown Frame'),
                            'fnid': suggestion.get('id', suggestion.get('fnid', '')),
                            'definition': suggestion.get('definition', ''),
                            'score': suggestion.get('score', 0),
                            'elements': suggestion.get('elements', [])
                        })
                
                logger.info(f"Found {len(suggestions)} suggestions")
            else:
                logger.warning(f"No FrameNet ID found for entity {entity.name}")
                messages.warning(request, f'No FrameNet ID found for entity {entity.name}')
            
            context = {
                **self.admin_site.each_context(request),
                'title': f'Frame Suggestions for {entity.name}',
                'entity': entity,
                'suggestions': suggestions[:10],  # Show top 10 suggestions
                'opts': self.model._meta,
                'has_permission': self.has_view_permission(request, entity),
            }
            
            return render(
                request,
                'admin/coreapp/entity/suggest_frames.html',
                context
            )
            
        except Entity.DoesNotExist:
            messages.error(request, 'Entity not found')
            return redirect('admin:coreapp_entity_changelist')
        except Exception as e:
            import traceback
            logger.error(f"Error getting suggestions for entity {entity_id}: {str(e)}\n{traceback.format_exc()}")
            messages.error(request, f'Error getting suggestions: {str(e)}')
            return redirect('admin:coreapp_entity_change', args=[entity_id])


# Register your models here
class EntityAdmin(admin.ModelAdmin):
    list_display = ('name', 'fnid', 'user_email', 'env_name', 'created_at')
    list_filter = ('env__name', 'created_at')
    search_fields = ('name', 'fnid', 'user__email')
    actions = ['suggest_frames_action']
    change_form_template = 'admin/coreapp/entity/change_form.html'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:entity_id>/suggestions/',
                self.admin_site.admin_view(self.frame_suggestions_view),
                name='entity-frame-suggestions',
            ),
        ]
        return custom_urls + urls
    
    def user_email(self, obj):
        return obj.user.email if obj.user else "-"
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'
    
    def env_name(self, obj):
        return obj.env.name if obj.env else "-"
    env_name.short_description = 'Environment'
    env_name.admin_order_field = 'env__name'
    
    def frame_suggestions_view(self, request, entity_id):
        """
        View for displaying frame suggestions for an entity.
        """
        from django.template.response import TemplateResponse
        from django.contrib import messages
        from django.shortcuts import redirect
        from django.urls import reverse
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            entity = Entity.objects.get(id=entity_id)
            logger.info(f"Processing frame suggestions for entity: {entity.name} (ID: {entity.id}, FrameNet ID: {entity.fnid})")
            
            # Get frame suggestions using the FrameNet service
            frame_net = FrameNetService()
            suggestion_service = FrameSuggestionService(frame_net)
            
            # Get the entity's FrameNet ID if available
            suggestions = []
            if entity.fnid:
                logger.info(f"Getting suggestions for FrameNet ID: {entity.fnid}")
                # Get suggestions based on the entity's FrameNet ID
                # The suggest_frames method expects a list of FrameNet IDs as strings
                raw_suggestions = suggestion_service.suggest_frames([str(entity.fnid)])
                
                # Process suggestions to match the expected template format
                for suggestion in raw_suggestions:
                    # Handle both direct frame suggestions and suggestions with frame data
                    if isinstance(suggestion, dict) and 'frame' in suggestion:
                        # This is a suggestion with detailed frame data
                        frame_data = suggestion['frame']
                        suggestions.append({
                            'name': frame_data.get('name', 'Unknown Frame'),
                            'fnid': frame_data.get('id', frame_data.get('fnid', '')),
                            'definition': frame_data.get('definition', ''),
                            'score': suggestion.get('score', 0),
                            'elements': []  # TODO: Add elements if needed
                        })
                    elif isinstance(suggestion, dict):
                        # This is a direct frame suggestion
                        suggestions.append({
                            'name': suggestion.get('name', 'Unknown Frame'),
                            'fnid': suggestion.get('id', suggestion.get('fnid', '')),
                            'definition': suggestion.get('definition', ''),
                            'score': suggestion.get('score', 0),
                            'elements': suggestion.get('elements', [])
                        })
                
                logger.info(f"Found {len(suggestions)} suggestions")
            else:
                logger.warning(f"No FrameNet ID found for entity {entity.name}")
                messages.warning(request, f'No FrameNet ID found for entity {entity.name}')
            
            context = {
                **self.admin_site.each_context(request),
                'title': f'Frame Suggestions for {entity.name}',
                'entity': entity,
                'suggestions': suggestions[:10],  # Show top 10 suggestions
                'opts': self.model._meta,
                'has_permission': self.has_view_permission(request, entity),
            }
            
            return TemplateResponse(
                request,
                'admin/coreapp/entity/suggest_frames.html',
                context
            )
            
        except Entity.DoesNotExist:
            messages.error(request, 'Entity not found')
            return redirect('admin:coreapp_entity_changelist')
        except Exception as e:
            import traceback
            logger.error(f"Error getting suggestions for entity {entity_id}: {str(e)}\n{traceback.format_exc()}")
            messages.error(request, f'Error getting suggestions: {str(e)}')
            return redirect('admin:coreapp_entity_change', args=[entity_id])
    
    def suggest_frames_action(self, request, queryset):
        """
        Admin action to suggest frames for selected entities.
        """
        if 'apply' in request.POST:
            # Handle the form submission
            frame_service = FrameNetService()
            suggestion_service = FrameSuggestionService(frame_service)
            
            entity_id = request.POST.get('entity_id')
            frame_id = request.POST.get('frame_id')
            
            if entity_id and frame_id:
                try:
                    entity = Entity.objects.get(id=entity_id)
                    frame = Frame.from_framenet(entity=entity, fnid=frame_id, is_primary=True)
                    
                    self.message_user(
                        request,
                        f'Successfully added frame {frame.name} to {entity.name}',
                        messages.SUCCESS
                    )
                    
                    # Redirect back to the entity change page
                    return HttpResponseRedirect(
                        reverse('admin:coreapp_entity_change', args=[entity_id])
                    )
                except Exception as e:
                    self.message_user(
                        request,
                        f'Error adding frame: {str(e)}',
                        messages.ERROR
                    )
            
            # If we get here, show the form again
            return HttpResponseRedirect(request.get_full_path())
        
        # Show the confirmation page
        if len(queryset) == 1:
            entity = queryset.first()
            
            # Get frame suggestions
            frame_service = FrameNetService()
            suggestion_service = FrameSuggestionService(frame_service)
            
            # Get the entity's FrameNet ID if available
            suggestions = []
            if entity.fnid:
                # Get suggestions based on the entity's FrameNet ID
                raw_suggestions = suggestion_service.suggest_frames([str(entity.fnid)])
                
                # Process suggestions to match the expected template format
                for suggestion in raw_suggestions:
                    # Handle both direct frame suggestions and suggestions with frame data
                    if isinstance(suggestion, dict) and 'frame' in suggestion:
                        # This is a suggestion with detailed frame data
                        frame_data = suggestion['frame']
                        suggestions.append({
                            'name': frame_data.get('name', 'Unknown Frame'),
                            'fnid': frame_data.get('id', frame_data.get('fnid', '')),
                            'definition': frame_data.get('definition', ''),
                            'score': suggestion.get('score', 0),
                            'elements': []
                        })
                    elif isinstance(suggestion, dict):
                        # This is a direct frame suggestion
                        suggestions.append({
                            'name': suggestion.get('name', 'Unknown Frame'),
                            'fnid': suggestion.get('id', suggestion.get('fnid', '')),
                            'definition': suggestion.get('definition', ''),
                            'score': suggestion.get('score', 0),
                            'elements': suggestion.get('elements', [])
                        })
            
            context = {
                'title': f'Suggest Frames for {entity.name}',
                'entity': entity,
                'suggestions': suggestions[:10],  # Show top 10 suggestions
                'opts': self.model._meta,
            }
            
            return render(
                request,
                'admin/coreapp/entity/suggest_frames.html',
                context
            )
        else:
            self.message_user(
                request,
                'Please select exactly one entity to suggest frames for.',
                messages.WARNING
            )
            return None
    
    suggest_frames_action.short_description = "Suggest frames for selected entities"


# Register your models here
admin.site.register(User)
admin.site.register(Environment)
admin.site.register(Entity, EntityAdmin)
admin.site.register(Frame, FrameAdmin)
admin.site.register(Element)
