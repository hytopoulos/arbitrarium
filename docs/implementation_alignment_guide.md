# FrameNet Simulation: Implementation Guide

## 🚀 Getting Started Guide

### Prerequisites
1. Python 3.11+
2. Docker and Docker Compose
3. NLTK with FrameNet data
4. PostgreSQL database

### Setup Instructions

#### 1. Clone and Initialize the Project
```bash
git clone <repository-url>
cd arbitrarium
cp .env.example .env  # Configure your environment variables
docker-compose up -d  # Start all services
```

#### 2. Install Dependencies
```bash
# In the backend directory
poetry install

# In the frontend directory
npm install
```

#### 3. Initialize the Database
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py loaddata initial_data.json
```

## 🏗️ Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

#### Step 1.1: Extend Entity Model
1. **File to Modify**: `/backend/coreapp/models.py`
2. **Tasks**:
   - Add new fields to Entity model:
     ```python
     active_frames = models.JSONField(default=dict)
     inventory = models.ManyToManyField('self', symmetrical=False, blank=True)
     properties = models.JSONField(default=dict)
     ```
   - Implement helper methods:
     - `can_participate_in(frame_name, role)`
     - `add_to_inventory(item)`
     - `update_property(key, value)`

#### Step 1.2: Environment and State Management
1. **File to Modify**: `/backend/coreapp/models.py`
2. **Implementation Steps**:
   - Extend the Environment model to include world state
   - Implement state management within the Environment class
   - Add transaction support
   - Write unit tests

### Phase 2: Frame Application (Week 2-3)

#### Step 2.1: Create Frame Application Service
1. **Create File**: `/backend/coreapp/services/frame_application.py`
2. **Implementation Steps**:
   - Create `FrameApplicator` class that works with Environment
   - Implement frame matching algorithm within environment context
   - Add role assignment logic tied to environment state
   - Write integration tests with environment state

#### Step 2.2: Implement Frame Handlers
1. **Directory**: `/backend/coreapp/services/frame_handlers/`
2. **Steps**:
   - Create base `FrameHandler` class
   - Implement specific frame handlers (e.g., `GivingFrameHandler`)
   - Add handler registration system

## 🧩 Core Components Reference

### 1. Entity System (`/backend/arb/entity.py`)
- **Purpose**: Manages entity state and frame participation within an environment
- **Key Methods**:
  ```python
  # Check if entity can participate in a frame role
  can_participate_in(self, frame_name: str, role: str) -> bool
  
  # Add item to inventory
  add_to_inventory(self, item: 'Entity') -> None
  
  # Update entity property
  update_property(self, key: str, value: Any) -> None
  ```

### 2. Environment and State Management (`/backend/coreapp/models.py`)
- **Purpose**: Manages simulation state within the Environment model
- **Key Methods**:
  ```python
  # Get entity state within this environment
  def get_entity_state(self, entity_id: int) -> Dict[str, Any]
  
  # Update entity state in this environment
  def update_entity_state(self, entity_id: int, updates: Dict[str, Any]) -> None
  
  # Get all entities in this environment
  def get_entities(self) -> QuerySet[Entity]
  
  # Save environment state
  def save_state(self) -> None
  ```

## 🔍 Testing Your Implementation

### Unit Tests
```bash
# Run all tests
docker-compose exec backend python manage.py test

# Run specific test module
docker-compose exec backend python manage.py test coreapp.tests.test_world_state
```

### API Testing
1. Start the development server:
   ```bash
   docker-compose up
   ```
2. Use the API at `http://localhost:8000/api/`
3. Test endpoints with curl or Postman

## 🐛 Debugging Tips

### Common Issues
1. **Frame Loading Errors**:
   - Verify NLTK data is downloaded
   - Check Docker volume mounts

2. **Database Connection Issues**:
   - Verify PostgreSQL is running
   - Check `.env` configuration

3. **Performance Problems**:
   - Add database indexes
   - Implement caching for frame lookups

## 📚 Additional Resources
- [FrameNet API Documentation](https://framenet.icsi.berkeley.edu/fndrupal/)
- [NLTK Documentation](https://www.nltk.org/)
- [Django REST Framework Docs](https://www.django-rest-framework.org/)
     - One-to-many with Element

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Entity Model Extensions

```python
# coreapp/models.py

class Entity(models.Model):
    """
    Enhanced entity model with frame-based capabilities and state management.
    """
    # Existing fields...
    
    # New fields
    active_frames = models.JSONField(
        default=dict,
        help_text="Mapping of frame names to roles this entity is currently participating in"
    )
    
    inventory = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        help_text="Entities currently in possession of this entity"
    )
    
    properties = models.JSONField(
        default=dict,
        help_text="Dynamic properties for entity state"
    )
    
    def can_participate_in(self, frame_name: str, role: str) -> bool:
        """
        Check if this entity can participate in a specific frame role.
        
        Args:
            frame_name: Name of the frame to check
            role: Specific role within the frame
            
        Returns:
            bool: True if entity can participate, False otherwise
            
        Example:
            >>> entity.can_participate_in('Giving', 'giver')
            True
        """
        return frame_name in self.frame_capabilities
    
    def add_to_inventory(self, item: 'Entity') -> None:
        """
        Add another entity to this entity's inventory.
        
        Args:
            item: Entity to add to inventory
            
        Raises:
            ValueError: If item cannot be added to inventory
        """
        if not isinstance(item, Entity):
            raise ValueError("Can only add Entity objects to inventory")
        self.inventory.add(item)
        self.save(update_fields=['inventory'])

    def update_property(self, key: str, value: Any) -> None:
        """
        Update a dynamic property of the entity.
        
        Args:
            key: Property name
            value: New property value (must be JSON-serializable)
        """
        self.properties[key] = value
        self.save(update_fields=['properties'])
```

#### 1.2 World State Service

```python
# coreapp/services/world_state.py
from typing import Dict, Any, Optional
from django.db import transaction
from coreapp.models import Entity

class Environment(models.Model):
    """
    Represents a simulation environment with its complete state.
    
    This model serves as the central authority for all state changes
    in the simulation, ensuring consistency and providing transaction
    support for complex operations.
    """
    
    def __init__(self):
        """Initialize a new, empty world state."""
        self.entities: Dict[int, Dict[str, Any]] = {}
        self.relations: Dict[tuple, Dict] = {}
        self.current_time: int = 0
        self._initialized = False
    
    @classmethod
    @transaction.atomic
    def from_db(cls) -> 'WorldState':
        """
        Load the complete world state from the database.
        
        Returns:
            WorldState: New instance populated with data from the database
            
        Raises:
            DatabaseError: If there's an issue loading the state
            """
        world = cls()
        try:
            # Load all entities with their relationships
            entities = Entity.objects.prefetch_related('inventory').all()
            
            for entity in entities:
                world.entities[entity.id] = {
                    'entity': entity,
                    'state': dict(entity.properties or {}),
                    'active_frames': dict(entity.active_frames or {}),
                    'inventory': list(entity.inventory.values_list('id', flat=True))
                }
            
            world._initialized = True
            return world
            
        except Exception as e:
            # Log the error and re-raise
            logger.error(f"Failed to load world state: {str(e)}")
            raise
    
    def get_entity_state(self, entity_id: int) -> Dict[str, Any]:
        """
        Get the current state of an entity.
        
        Args:
            entity_id: ID of the entity to retrieve
            
        Returns:
            dict: Entity state dictionary
            
        Raises:
            KeyError: If entity ID is not found
        """
        if entity_id not in self.entities:
            raise KeyError(f"Entity {entity_id} not found in world state")
        return self.entities[entity_id]
    
    def update_entity_state(self, entity_id: int, updates: Dict[str, Any]) -> None:
        """
        Update the state of an entity.
        
        Args:
            entity_id: ID of the entity to update
            updates: Dictionary of state updates to apply
            
        Raises:
            KeyError: If entity ID is not found
            ValueError: If updates are invalid
        """
        if entity_id not in self.entities:
            raise KeyError(f"Cannot update non-existent entity {entity_id}")
            
        # Validate updates against schema if needed
        self._validate_entity_updates(updates)
        
        # Apply updates
        self.entities[entity_id].update(updates)
        
        # Mark as dirty for persistence
        self.entities[entity_id]['_dirty'] = True
    
    def _validate_entity_updates(self, updates: Dict[str, Any]) -> None:
        """
        Validate entity state updates.
        
        Args:
            updates: Dictionary of updates to validate
            
        Raises:
            ValueError: If updates are invalid
        """
        # TODO: Implement validation logic
        pass
    
    def commit_changes(self) -> None:
        """
        Persist all changes to the database.
        
        This should be called at the end of each simulation tick
        or after a complete set of related updates.
        """
        with transaction.atomic():
            for entity_id, data in self.entities.items():
                if data.get('_dirty', False):
                    entity = data['entity']
                    entity.properties = data['state']
                    entity.active_frames = data['active_frames']
                    
                    # Update inventory if needed
                    current_inventory = set(entity.inventory.values_list('id', flat=True))
                    new_inventory = set(data.get('inventory', []))
                    
                    if current_inventory != new_inventory:
                        entity.inventory.set(Entity.objects.filter(id__in=new_inventory))
                    
                    entity.save(update_fields=['properties', 'active_frames'])
                    data['_dirty'] = False
```

### Phase 2: Frame Application (Week 2-3)

#### 2.1 Frame Application Service

```python
# coreapp/services/frame_application.py
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class FrameApplicationError(Exception):
    """Base exception for frame application errors."""
    pass

class RoleAssignmentError(FrameApplicationError):
    """Raised when role assignment fails."""
    pass

@dataclass
class FrameMatch:
    """Represents a potential frame application."""
    frame_name: str
    role_assignments: Dict[str, int]  # role -> entity_id
    confidence: float
    required_roles: Set[str]
    optional_roles: Set[str]

class FrameApplicator:
    """
    Handles the application of frames to entities in the world.
    
    This service is responsible for finding applicable frames for entities,
    assigning roles, and executing frame applications while maintaining
    world state consistency.
    """
    
    def __init__(self, world_state):
        """
        Initialize with a reference to the current world state.
        
        Args:
            world_state: The current WorldState instance
        """
        self.world = world_state
        self._frame_cache = {}  # Cache for frame definitions
    
    def find_applicable_frames(
        self, 
        entity1_id: int, 
        entity2_id: int,
        context: Optional[Dict] = None
    ) -> List[FrameMatch]:
        """
        Find all frames where both entities can participate.
        
        Args:
            entity1_id: First entity ID
            entity2_id: Second entity ID
            context: Optional context for frame selection
            
        Returns:
            List of FrameMatch objects representing possible applications
            
        Raises:
            KeyError: If either entity is not found
        """
        # Input validation
        entity1 = self.world.get_entity_state(entity1_id)['entity']
        entity2 = self.world.get_entity_state(entity2_id)['entity']
        
        # Get intersection of frame capabilities
        common_frames = set(entity1.frame_capabilities) & set(entity2.frame_capabilities)
        
        # Find all valid role assignments
        matches = []
        for frame_name in common_frames:
            try:
                role_assignments = self._assign_roles(frame_name, entity1, entity2, context or {})
                if role_assignments:
                    frame_info = self._get_frame_info(frame_name)
                    matches.append(FrameMatch(
                        frame_name=frame_name,
                        role_assignments=role_assignments,
                        confidence=self._calculate_confidence(frame_name, role_assignments, context),
                        required_roles=set(frame_info.get('required_roles', [])),
                        optional_roles=set(frame_info.get('optional_roles', []))
                    ))
            except RoleAssignmentError as e:
                logger.debug(f"Could not assign roles for frame {frame_name}: {str(e)}")
                continue
        
        # Sort by confidence (highest first)
        return sorted(matches, key=lambda x: -x.confidence)
    
    def apply_frame(
        self, 
        frame_name: str, 
        role_assignments: Dict[str, int],
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Apply a frame with the given role assignments.
        
        Args:
            frame_name: Name of the frame to apply
            role_assignments: Mapping of roles to entity IDs
            context: Additional context for frame application
            
        Returns:
            dict: Results of the frame application
            
        Raises:
            FrameApplicationError: If frame cannot be applied
        """
        # Implementation details...
        pass
    
    def _assign_roles(
        self,
        frame_name: str,
        entity1: 'Entity',
        entity2: 'Entity',
        context: Dict
    ) -> Dict[str, int]:
        """
        Determine role assignments for a frame application.
        
        Args:
            frame_name: Name of the frame
            entity1: First entity
            entity2: Second entity
            context: Application context
            
        Returns:
            dict: Mapping of roles to entity IDs
            
        Raises:
            RoleAssignmentError: If roles cannot be assigned
        """
        # Implementation details...
        pass
    
    def _get_frame_info(self, frame_name: str) -> Dict:
        """
        Get frame information from cache or load it.
        
        Args:
            frame_name: Name of the frame
            
        Returns:
            dict: Frame information including roles and constraints
        """
        if frame_name not in self._frame_cache:
            # Load frame info and cache it
            pass
        return self._frame_cache[frame_name]
    
    def _calculate_confidence(
        self,
        frame_name: str,
        role_assignments: Dict[str, int],
        context: Dict
    ) -> float:
        """
        Calculate confidence score for a frame application.
        
        Args:
            frame_name: Name of the frame
            role_assignments: Proposed role assignments
            context: Application context
            
        Returns:
            float: Confidence score between 0 and 1
        """
        # Implementation details...
        return 0.5  # Default confidence
```

#### 2.2 Frame Handlers
```python
# coreapp/services/frame_handlers/
# Base handler
class FrameHandler(ABC):
    @abstractmethod
    def handle(self, world, frame_app):
        pass

# Example: giving.py
class GivingHandler(FrameHandler):
    def handle(self, world, frame_app):
        giver_id = frame_app.participants['giver']
        recipient_id = frame_app.participants['recipient']
        theme_id = frame_app.participants['theme']
        
        # Update world state
        world.entities[giver_id]['inventory'].remove(theme_id)
        world.entities[recipient_id]['inventory'].append(theme_id)
        
        return world
```

### Phase 3: Simulation Engine (Week 3-4)

#### 3.1 Simulation Service
```python
# coreapp/services/simulation.py
class SimulationEngine:
    def __init__(self, world_state=None):
        self.world = world_state or WorldState.from_db()
        self.frame_applicator = FrameApplicator(self.world)
        self.handlers = self._load_handlers()
    
    def step(self):
        """Execute one simulation step"""
        # 1. Select entities to interact
        entity1, entity2 = self._select_interacting_entities()
        if not (entity1 and entity2):
            return False
            
        # 2. Find applicable frames
        frames = self.frame_applicator.find_applicable_frames(entity1.id, entity2.id)
        if not frames:
            return False
            
        # 3. Apply best frame
        frame_name = self._select_best_frame(frames)
        self.frame_applicator.apply_frame(frame_name, {
            # Determine roles based on frame
        })
        
        return True
```

## Integration Points

### API Endpoints

1. **Get Possible Interactions**
   ```
   GET /api/simulation/possible-interactions/?entity1_id=1&entity2_id=2
   ```
   - Returns list of possible frames that can be applied

2. **Execute Simulation Step**
   ```
   POST /api/simulation/step/
   {
       "entity1_id": 1,
       "entity2_id": 2,
       "frame": "Giving",
       "role_assignments": {
           "giver": 1,
           "recipient": 2,
           "theme": 3
       }
   }
   ```

## Data Migration Plan

1. **Add New Fields**
   ```python
   # In migrations/XXXX_add_simulation_fields.py
   from django.db import migrations, models
   import json

   def add_simulation_fields(apps, schema_editor):
       Entity = apps.get_model('coreapp', 'Entity')
       for entity in Entity.objects.all():
           entity.active_frames = {}
           entity.properties = {}
           entity.save()
   ```

## Testing Strategy

1. **Unit Tests**
   - Frame matching logic
   - Frame application effects
   - World state transitions

2. **Integration Tests**
   - Full simulation steps
   - API endpoints
   - Database interactions

## Deployment Plan

1. **Backend**
   - Deploy database migrations first
   - Deploy updated services
   - Monitor for performance issues

2. **Frontend**
   - Add simulation controls to UI
   - Display simulation state
   - Handle simulation events

## Next Steps

1. Implement core services (WorldState, FrameApplicator)
2. Create basic frame handlers
3. Set up simulation API endpoints
4. Build frontend integration
5. Test and iterate

## Dependencies

- Python 3.8+
- Django 3.2+
- NLTK with FrameNet data
- Django REST Framework
