---
trigger: always_on
---

All debugging of frontend/ and backend/ should consider that the repository runs inside a docker image.

We can execute in the backend like so: docker compose exec backend poetry run python manage.py migrate authtoken