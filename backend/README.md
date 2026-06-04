# EvolveAgent AI Backend

FastAPI backend for the EvolveAgent AI multi-agent prototype.

## Run

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
pytest
```
