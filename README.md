# ExoAtlas

Interactive visualization app for NASA exoplanet datasets.

## Setup

This project is managed with [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

## Run

```bash
uv run streamlit run src/exoatlas/app.py
```

## Checks

```bash
uv run ruff check .
uv run pytest
```
