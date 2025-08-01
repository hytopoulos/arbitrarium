# Proposal: Enhancing Entity-Frame Integration with FrameNet

## Overview

This proposal outlines a plan to enhance the integration between entities and FrameNet frames in the Arbitrarium system. The goal is to provide a more robust and flexible way to associate FrameNet frames with entities, enabling richer semantic representations and more sophisticated natural language understanding capabilities.

## Current State

- Entities are currently associated with a single FrameNet frame via the `fnid` field.
- The `Frame` model exists but has minimal fields (just `entity` and `fnid`).
- Frame elements are stored in the `Element` model but aren't fully utilized.
- The `arb` module contains FrameNet integration code that isn't fully leveraged by the backend.

## Proposed Enhancements

### 1. Frame Model Enhancement

```python
class Frame(models.Model):
    # Existing fields
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="frames")
    fnid = models.IntegerField(null=True)
    
    # New fields
    name = models.CharField(max_length=255)  # Frame name from FrameNet
    definition = models.TextField(null=True, blank=True)  # Frame definition
    is_primary = models.BooleanField(default=False)  # Whether this is the primary frame
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_primary', 'name']
```

### 2. Element Model Enhancement

```python
class Element(models.Model):
    frame = models.ForeignKey(Frame, on_delete=models.CASCADE, related_name="elements")
    fnid = models.IntegerField(null=True)
    name = models.CharField(max_length=255)  # Element name from FrameNet
    core_type = models.CharField(  # Core, Core-Unexpressed, etc.
        max_length=50,
        choices=[
            ('core', 'Core'),
            ('core_ue', 'Core-Unexpressed'),
            ('peripheral', 'Peripheral'),
            ('extra_thematic', 'Extra-Thematic'),
        ],
        default='core'
    )
    definition = models.TextField(null=True, blank=True)  # Element definition
    value = models.JSONField(null=True, blank=True)  # Flexible value storage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['core_type', 'name']
```

### 3. Frame Management API Endpoints

#### GET /api/ent/<entity_id>/frames/
List all frames associated with an entity.

#### POST /api/ent/<entity_id>/frames/
Add a new frame to an entity.

#### GET /api/frames/<frame_id>/
Retrieve details of a specific frame.

#### PUT /api/frames/<frame_id>/
Update a frame's details.

#### DELETE /api/frames/<frame_id>/
Remove a frame from an entity.

### 4. Frame Discovery Endpoints

#### GET /api/framenet/frames/?q=<query>
Search for frames by name or definition.

#### GET /api/framenet/frames/<fnid>/
Get details of a specific FrameNet frame.

#### GET /api/framenet/frames/suggest/<entity_id>/
Get suggested frames for an entity based on its properties.

### 5. Frame-Element Management

#### GET /api/frames/<frame_id>/elements/
List all elements in a frame.

#### PUT /api/frames/<frame_id>/elements/<element_id>/
Update an element's value.

### 6. Implementation Phases

#### Phase 1: Model Updates (1 week)
- Update database models
- Create and run migrations
- Update serializers

#### Phase 2: Basic API Endpoints (1 week)
- Implement CRUD operations for frames
- Add frame search functionality
- Update entity serializers to include frames

#### Phase 3: Frame Suggestion System (2 weeks)
- Implement frame suggestion based on entity properties
- Add frame-element value suggestions
- Create admin interface for managing frames

#### Phase 4: Advanced Features (2 weeks)
- Frame validation
- Frame-frame relationships
- Performance optimizations

## Technical Considerations

1. **Performance**:
   - Cache frequently accessed frames and elements
   - Use select_related/prefetch_related for database optimizations
   - Consider denormalization for read-heavy operations

2. **Data Consistency**:
   - Use database transactions for multi-model updates
   - Implement proper error handling and validation
   - Add database constraints where appropriate

3. **Integration with NLP Pipeline**:
   - Enhance the `arb` module to provide better frame discovery
   - Add methods for automatic frame suggestion based on entity properties
   - Support for frame semantics in text generation

## Benefits

1. **Richer Semantic Representation**: Entities can have multiple frames with detailed element values.
2. **Better NLP Integration**: Improved support for natural language understanding and generation.
3. **Flexibility**: Support for various types of frames and elements.
4. **Extensibility**: Easy to add new frames and elements as needed.

## Risks and Mitigations

1. **Performance Impact**:
   - Risk: Additional database queries could slow down the system.
   - Mitigation: Implement caching and optimize queries.

2. **Data Complexity**:
   - Risk: More complex data model might be harder to maintain.
   - Mitigation: Provide clear documentation and helper methods.

3. **FrameNet Coverage**:
   - Risk: FrameNet might not cover all needed frames.
   - Mitigation: Allow custom frames and elements.

## Future Enhancements

1. **Frame Composition**: Allow combining multiple frames for complex entities.
2. **Frame Validation**: Ensure frame elements have valid values.
3. **Frame Visualization**: Visual representation of frames and their elements.
4. **Frame Learning**: Automatically suggest frames based on entity usage.

## Conclusion

This proposal outlines a comprehensive approach to enhancing the integration between entities and FrameNet frames. The proposed changes will provide a solid foundation for more sophisticated natural language understanding and generation capabilities in the Arbitrarium system.
