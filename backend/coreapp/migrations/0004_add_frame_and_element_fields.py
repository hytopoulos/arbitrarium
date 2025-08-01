from django.db import migrations, models
import django.utils.timezone


def set_default_frame_fields(apps, schema_editor):
    Frame = apps.get_model('coreapp', 'Frame')
    # Set default values for existing frames
    Frame.objects.update(
        name='',
        definition='',
        is_primary=False,
        created_at=django.utils.timezone.now(),
        updated_at=django.utils.timezone.now()
    )


def set_default_element_fields(apps, schema_editor):
    Element = apps.get_model('coreapp', 'Element')
    # Set default values for existing elements
    Element.objects.update(
        name='',
        core_type='core',
        definition='',
        created_at=django.utils.timezone.now(),
        updated_at=django.utils.timezone.now()
    )


class Migration(migrations.Migration):

    dependencies = [
        ('coreapp', '0003_entity_name'),
    ]

    operations = [
        # Add new fields to Frame model
        migrations.AddField(
            model_name='frame',
            name='name',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='frame',
            name='definition',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='frame',
            name='is_primary',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='frame',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='frame',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        
        # Add new fields to Element model (except value field for now)
        migrations.AddField(
            model_name='element',
            name='name',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='element',
            name='core_type',
            field=models.CharField(choices=[
                ('core', 'Core'),
                ('core_ue', 'Core-Unexpressed'),
                ('peripheral', 'Peripheral'),
                ('extra_thematic', 'Extra-Thematic')
            ], default='core', max_length=20),
        ),
        migrations.AddField(
            model_name='element',
            name='definition',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='element',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='element',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        
        # Set default values for existing data
        migrations.RunPython(set_default_frame_fields, migrations.RunPython.noop),
        migrations.RunPython(set_default_element_fields, migrations.RunPython.noop),
        
        # Add indexes
        migrations.AddIndex(
            model_name='frame',
            index=models.Index(fields=['entity', 'is_primary'], name='coreapp_fr_entity__7b9e0b_idx'),
        ),
        migrations.AddIndex(
            model_name='frame',
            index=models.Index(fields=['fnid'], name='coreapp_fr_fnid_5d0d4f_idx'),
        ),
        migrations.AddIndex(
            model_name='element',
            index=models.Index(fields=['frame', 'core_type'], name='coreapp_el_frame_i_0f3f7c_idx'),
        ),
        migrations.AddIndex(
            model_name='element',
            index=models.Index(fields=['fnid'], name='coreapp_el_fnid_7b4c23_idx'),
        ),
    ]
