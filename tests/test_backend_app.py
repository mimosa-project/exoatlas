from fastapi import FastAPI

from backend.exoatlas_api.config import get_settings
from backend.exoatlas_api.main import app, create_app


def test_create_app_returns_fastapi_app() -> None:
    created_app = create_app()

    assert isinstance(created_app, FastAPI)
    assert created_app.title == "ExoAtlas API"


def test_module_app_is_fastapi_app() -> None:
    assert isinstance(app, FastAPI)


def test_settings_uses_composite_csv_environment_variable(monkeypatch) -> None:
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", "/tmp/exoatlas-test.csv")

    settings = get_settings()

    assert settings.dataset_path.as_posix() == "/tmp/exoatlas-test.csv"

    get_settings.cache_clear()
