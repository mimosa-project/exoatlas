from pathlib import Path

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.exoatlas_api.config import DEFAULT_CORS_ORIGINS, get_settings
from backend.exoatlas_api.main import create_app
from backend.exoatlas_api.services.dataset import REQUIRED_COLUMNS, clear_composite_dataset_cache

FRONTEND_API_PATHS = (
    "/health",
    "/api/planets",
    "/api/planets/{planet_name}",
    "/api/discoveries/timeline",
    "/api/discovery-methods",
    "/api/scatter/orbit-radius",
    "/api/sky-map",
)

SAMPLE_PLANET_ROW = {
    "rowid": 1,
    "pl_name": "Kepler-22 b",
    "hostname": "Kepler-22",
    "discoverymethod": "Transit",
    "disc_year": 2011,
    "pl_orbper": 289.8623,
    "pl_orbsmax": 0.849,
    "pl_rade": 2.1,
    "pl_bmasse": None,
    "pl_dens": None,
    "pl_eqt": 262,
    "st_teff": 5518,
    "st_rad": 0.979,
    "st_mass": 0.97,
    "st_spectype": "G5",
    "ra": 285.679421,
    "dec": 47.897,
    "sy_dist": 194.697,
}


def write_dataset(path: Path, rows: list[dict[str, object]]) -> None:
    pd.DataFrame(rows, columns=REQUIRED_COLUMNS).to_csv(path, index=False)


def registered_get_paths(app: FastAPI) -> set[str]:
    paths: set[str] = set()
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if methods and "GET" in methods and path is not None:
            paths.add(path)
    return paths


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    dataset_path = tmp_path / "planets.csv"
    write_dataset(dataset_path, [SAMPLE_PLANET_ROW])
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())

    with TestClient(create_app()) as test_client:
        yield test_client

    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_frontend_api_routes_are_registered() -> None:
    paths = registered_get_paths(create_app())

    assert set(FRONTEND_API_PATHS).issubset(paths)


@pytest.mark.parametrize("origin", DEFAULT_CORS_ORIGINS)
def test_cors_preflight_allows_vite_origins(client: TestClient, origin: str) -> None:
    response = client.options(
        "/api/planets",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


def test_cors_preflight_rejects_unknown_origin(client: TestClient) -> None:
    response = client.options(
        "/api/planets",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400


@pytest.mark.parametrize(
    ("path", "params"),
    [
        ("/health", None),
        ("/api/planets", None),
        ("/api/planets/Kepler-22%20b", None),
        ("/api/discoveries/timeline", None),
        ("/api/discovery-methods", None),
        ("/api/scatter/orbit-radius", None),
        ("/api/sky-map", None),
    ],
)
def test_frontend_api_paths_respond_with_cors_headers(
    client: TestClient,
    path: str,
    params: dict[str, str] | None,
) -> None:
    response = client.get(
        path,
        params=params,
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_origins_can_be_configured_via_environment(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dataset_path = tmp_path / "planets.csv"
    write_dataset(dataset_path, [SAMPLE_PLANET_ROW])
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    monkeypatch.setenv("EXOATLAS_CORS_ORIGINS", "http://localhost:3000")

    client = TestClient(create_app())
    response = client.options(
        "/api/planets",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

    clear_composite_dataset_cache()
    get_settings.cache_clear()
