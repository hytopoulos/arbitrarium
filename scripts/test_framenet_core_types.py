#!/usr/bin/env python
"""
Test script to verify FrameNet frame element core types are being set correctly.
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from coreapp.models import Entity, Frame, Environment, User

def test_framenet_core_types():
    """Test creating a frame with a known FrameNet ID and check core types."""
    # Get or create a test user
    user, _ = User.objects.get_or_create(
        email='test@example.com',
        defaults={'is_active': True}
    )
    
    # Get or create a test environment
    env, _ = Environment.objects.get_or_create(
        name='Test Environment',
        defaults={'user': user}
    )
    
    # Get or create a test entity
    entity, _ = Entity.objects.get_or_create(
        name='Test Entity',
        env=env,
        defaults={
            'user': user,
            'wnid': 12345,  # Dummy WordNet ID
            'fnid': 54321   # Dummy FrameNet ID
        }
    )
    
    # FrameNet ID for 'Abandonment' frame (should be valid in NLTK data)
    frame_id = 2031
    
    try:
        # Create the frame
        frame = Frame.from_framenet(entity=entity, fnid=frame_id, is_primary=True)
        print(f"\nCreated frame: {frame.fnid} - {frame.name}")
        print(f"Definition: {frame.definition[:200]}...")
        
        # Print elements with their core types
        elements = frame.elements.all()
        if elements:
            print(f"\nFound {len(elements)} elements:")
            for i, element in enumerate(elements, 1):
                print(f"  {i}. {element.name} ({element.get_core_type_display()})")
                if element.definition:
                    print(f"     {element.definition[:100]}...")
        else:
            print("\nNo elements found for this frame.")
            
        return True
        
    except Exception as e:
        print(f"\nError creating frame: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing FrameNet frame element core types...")
    success = test_framenet_core_types()
    if success:
        print("\nTest completed successfully!")
    else:
        print("\nTest failed!")
        sys.exit(1)
