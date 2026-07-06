# ExoAtlas

Interactive visualization app for NASA exoplanet datasets.

## Setup

This project is managed with [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

## Run

Streamlit prototype:

```bash
uv run streamlit run src/exoatlas/app.py
```

FastAPI backend (for frontend development):

```bash
uv run uvicorn backend.exoatlas_api.main:app --reload --host 127.0.0.1 --port 8000
```

The API is served at `http://127.0.0.1:8000`. Frontend clients should set `VITE_API_BASE_URL=http://127.0.0.1:8000`.

CORS allows Vite dev server origins (`http://localhost:5173`, `http://127.0.0.1:5173`) by default. Override with comma-separated `EXOATLAS_CORS_ORIGINS` if needed.

## Checks

```bash
uv run ruff check .
uv run pytest
```
