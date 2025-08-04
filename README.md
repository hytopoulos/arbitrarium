# Arbitrarium -- An interactive simulation of lexical relationships.

Arbitrarium is a web app for simulating stateful entities (dictionary nouns) by applying lexical relationships found in [WordNet](https://wordnet.princeton.edu) and [FrameNet](http://framenet.icsi.berkeley.edu).

![Screenshot of the app](demo.png)

## Building

1. Create a virtual environment
```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install requirements
```bash
pip install -r requirements.txt
```

3. Build docker image
```bash
docker compose build
```

4. Run docker image
```bash
docker compose up -d
```

5. Add superuser
```bash
docker compose exec backend poetry run python manage.py createsuperuser
```
