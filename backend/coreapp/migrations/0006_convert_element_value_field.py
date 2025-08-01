import json
from django.db import migrations, models


def convert_binary_to_json(value):
    """Convert binary data to a JSON-serializable value."""
    if value is None:
        return None
    try:
        # If it's already a string, try to parse as JSON
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {"value": value}
        # If it's bytes, decode to string first
        elif isinstance(value, (bytes, bytearray)):
            try:
                decoded = value.decode('utf-8')
                try:
                    return json.loads(decoded)
                except json.JSONDecodeError:
                    return {"value": decoded}
            except UnicodeDecodeError:
                return {"binary_data": True}
        # For other types, return as is
        return value
    except Exception as e:
        return {"error": str(e), "original_value": str(value)}


def convert_element_values(apps, schema_editor):
    """Convert binary values to JSON values."""
    Element = apps.get_model('coreapp', 'Element')
    
    # Process elements in batches to avoid memory issues
    batch_size = 100
    elements = Element.objects.all()
    total = elements.count()
    
    for i in range(0, total, batch_size):
        batch = elements[i:i+batch_size]
        updated_elements = []
        
        for element in batch:
            if element.value is not None:
                element.value = convert_binary_to_json(element.value)
                updated_elements.append(element)
        
        # Bulk update the batch
        if updated_elements:
            Element.objects.bulk_update(updated_elements, ['value'])


class Migration(migrations.Migration):
    dependencies = [
        ('coreapp', '0005_convert_element_value'),
    ]

    operations = [
        # Step 1: Add a temporary TextField to store the converted value
        migrations.AddField(
            model_name='element',
            name='temp_value',
            field=models.JSONField(blank=True, null=True),
        ),
        
        # Step 2: Convert binary data to JSON in the temporary field
        migrations.RunPython(convert_element_values, migrations.RunPython.noop),
        
        # Step 3: Remove the old value field
        migrations.RemoveField(
            model_name='element',
            name='value',
        ),
        
        # Step 4: Rename temp_value to value
        migrations.RenameField(
            model_name='element',
            old_name='temp_value',
            new_name='value',
        ),
    ]
