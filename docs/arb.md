# ARB Module Documentation

This document outlines the interface between the `arb/` module and the rest of the backend application.

## Overview

The `arb/` directory contains core natural language processing (NLP) functionality, primarily focused on semantic analysis using WordNet and FrameNet. It serves as a bridge between raw text input and the structured data used by the backend application.

## Key Components

### 1. Entity System

#### `entity.py`
- **Purpose**: Represents stateful objects/nouns defined by WordNet and FrameNet relations.
- **Key Classes**:
  - `Entity`: Main class representing a semantic entity with associated frames and properties.
  - Methods like `from_name()` and `from_root()` for entity creation.

#### `element.py`
- **Purpose**: Represents FrameNet Frame Elements.
- **Key Classes**:
  - `Element`: Instance of a FrameNet Frame Element with attributes like name, ID, and semantic type.

### 2. Frame System

#### `frames/`
- **Purpose**: Manages FrameNet frames and their relationships.
- **Key Components**:
  - `Frame` class in `frame.py`: Represents a FrameNet frame with elements and relations.
  - `suasion.py`: Specialized frame types (e.g., for handling persuasion).
  - `__init__.py`: Provides factory functions like `wrap_fnframe()` and `make_frame()`.

### 3. Utilities (`util.py`)

Core utility functions including:
- `query_noun()`: Main entry point for noun queries, returning FrameNet matches.
- `get_synset()`: Retrieves WordNet synsets with frequency-based weighting.
- `query_framenet()`: Queries FrameNet for lexical units.
- `lemma_frequencies()`: Handles lemma frequency calculations.

## Backend Integration

### API Endpoints

#### Corpus View (`coreapp/views/corpus.py`)
- **Endpoint**: `/api/corpus/`
- **Functionality**:
  - Accepts noun queries via the `name` parameter.
  - Uses `arb.util.query_noun()` to process queries.
  - Returns structured FrameNet matches.

#### Entity View (`coreapp/views/entity.py`)
- **Endpoints**:
  - `GET /api/ent/`: List entities with optional filtering.
  - `POST /api/ent/`: Create new entities.
- **Integration**:
  - Uses `arb` module for entity creation and management.
  - Maps between database models and `arb` module's semantic representations.

### Data Flow

1. **Request Handling**:
   - User requests come through Django views.
   - Views extract relevant parameters (e.g., noun to query).

2. **Processing**:
   - `arb.util.query_noun()` is called with the input.
   - The function queries WordNet and FrameNet to find matches.
   - Results are processed and formatted.

3. **Response**:
   - Structured data is returned to the client.
   - Error handling and logging occur at each stage.

## Example Usage

### Querying a Noun

```python
# In a Django view
from arb.util import query_noun

def get_noun_info(request):
    noun = request.GET.get('noun')
    if not noun:
        return Response({'error': 'No noun provided'}, status=400)
    
    results = query_noun(noun)
    return Response(results)
```

### Creating an Entity

```python
from arb.entity import Entity

def create_entity(noun):
    try:
        entity = Entity.from_name(noun)
        # Process entity and save to database
        return entity
    except ValueError as e:
        # Handle entity creation failure
        return None
```

## Notes on Docker Context

- The application runs inside a Docker container.
- NLTK data (WordNet, FrameNet) is downloaded during container startup.
- The `arb` module's functionality is available throughout the backend application.

## Dependencies

- NLTK (WordNet, FrameNet)
- NumPy (for numerical operations)
- Django (for backend integration)
