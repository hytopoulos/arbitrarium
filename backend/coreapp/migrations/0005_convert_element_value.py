from django.db import migrations, models
import json
from django.db.models.fields import BinaryField


def convert_binary_to_text(value):
    """Convert binary data to text if possible, otherwise return None."""
    if value is None:
        return None
    try:
        # Try to decode binary data as UTF-8
        if isinstance(value, (bytes, bytearray)):
            return value.decode('utf-8')
        return str(value)
    except (UnicodeDecodeError, AttributeError):
        return None


def convert_element_values(apps, schema_editor):
    """Convert binary values to JSON-serializable values."""
    Element = apps.get_model('coreapp', 'Element')
    
    # First, update all elements to have a valid string value
    for element in Element.objects.all():
        if element.value is not None:
            # Convert binary data to text
            text_value = convert_binary_to_text(element.value)
            if text_value is not None:
                try:
                    # Try to parse as JSON if it looks like JSON
                    json.loads(text_value)
                    element.value = text_value
                except (json.JSONDecodeError, TypeError):
                    # If not valid JSON, store as a simple string
                    element.value = json.dumps({"value": text_value})
                element.save(update_fields=['value'])


class Migration(migrations.Migration):
    dependencies = [
        ('coreapp', '0004_add_frame_and_element_fields'),
    ]

    operations = [
        # Step 1: Add a temporary TextField to store the converted value
        migrations.AddField(
            model_name='element',
            name='temp_value',
            field=models.TextField(blank=True, null=True),
        ),
        
        # Step 2: Convert binary data to text in the temporary field
        migrations.RunPython(convert_element_values, migrations.RunPython.noop),
        
        # Step 3: Remove the old value field
        migrations.RemoveField(
            model_name='element',
            name='value',
        ),
        
        # Step 4: Rename temp_value to value with JSONField type
        migrations.RenameField(
            model_name='element',
            old_name='temp_value',
            new_name='value',
        ),
        
        # Step 5: Convert the TextField to JSONField
        migrations.AlterField(
            model_name='element',
            name='value',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
