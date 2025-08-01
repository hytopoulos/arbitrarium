# Backend Testing Guide

This document explains how to run and work with backend tests in the project.

## Prerequisites

- Docker and Docker Compose installed
- Project dependencies installed (handled automatically by Docker)

## Running Tests

### Running All Tests

To run all backend tests:

```bash
docker compose exec backend poetry run pytest
```

### Running Specific Test Files

To run a specific test file (e.g., `test_models.py`):

```bash
docker compose exec backend poetry run pytest coreapp/tests/test_models.py
```

### Running Specific Test Functions

To run a specific test function (e.g., `test_create_frame`):

```bash
docker compose exec backend poetry run pytest coreapp/tests/test_models.py::test_create_frame -v
```

### Running with Coverage

To run tests with coverage report:

```bash
docker compose exec backend poetry run pytest --cov=coreapp
```

## Test Structure

- Tests are located in the `coreapp/tests/` directory
- Test files follow the naming convention `test_*.py`
- Test functions use the `@pytest.mark.django_db` decorator for database access

## Writing Tests

1. Create a new test file following the `test_*.py` naming convention
2. Import necessary modules and test utilities
3. Write test functions with descriptive names starting with `test_`
4. Use fixtures for common test data (see existing tests for examples)
5. Add appropriate assertions to verify expected behavior

## Common Test Patterns

### Database Fixtures

Use the `@pytest.mark.django_db` decorator for tests that need database access:

```python
import pytest

@pytest.mark.django_db
def test_something():
    # Test code here
    pass
```

### Testing Models

Test model methods, properties, and validations:

```python
def test_model_creation():
    instance = MyModel.objects.create(field1='value1')
    assert instance.field1 == 'value1'
```

### Testing Views

Test API endpoints and view functions:

```python
def test_api_endpoint(client):
    response = client.get('/api/endpoint/')
    assert response.status_code == 200
    # Additional assertions
```

## Debugging Tests

To debug a failing test, you can use Python's built-in `pdb` debugger by adding this line where you want to set a breakpoint:

```python
import pdb; pdb.set_trace()
```

Then run the test with the `-s` flag to disable output capturing:

```bash
docker compose exec backend poetry run pytest test_file.py::test_function -s
```

## Best Practices

1. Keep tests focused on a single piece of functionality
2. Use descriptive test names
3. Test both success and error cases
4. Keep tests independent and isolated
5. Use fixtures to avoid code duplication
6. Maintain a balance between unit and integration tests
