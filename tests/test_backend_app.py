from fastapi import FastAPI

from backend.exoatlas_api.main import app, create_app


def test_create_app_returns_fastapi_app() -> None:
    created_app = create_app()

    assert isinstance(created_app, FastAPI)
    assert created_app.title == "ExoAtlas API"


def test_module_app_is_fastapi_app() -> None:
    assert isinstance(app, FastAPI)
