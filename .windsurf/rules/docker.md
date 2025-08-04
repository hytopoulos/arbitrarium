---
trigger: always_on
---

All debugging of frontend/ and backend/ should consider that the repository runs inside a docker image.

We can execute in the backend like so: docker compose exec backend poetry run python manage.py migrate authtoken

We can check docker logs for build errors

we can test on the backend like so:
docker compose exec backend python manage.py shell -c "from coreapp.models import Frame; frame=Frame.from_framenet(xxx);"