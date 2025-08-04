---
trigger: always_on
---

All debugging of frontend/ and backend/ must take place inside the docker containers.

You may test on the backend like so:
docker compose exec backend python manage.py shell -c "from coreapp.models import Frame; frame=Frame.from_framenet(xxx);"

Always check docker logs for build or runtime errors