from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from backend.exoatlas_api.config import get_settings
from backend.exoatlas_api.main import create_app
from backend.exoatlas_api.services.dataset import REQUIRED_COLUMNS, clear_composite_dataset_cache


def write_dataset(path: Path, rows: list[dict[str, object]]) -> None:
    pd.DataFrame(rows, columns=REQUIRED_COLUMNS).to_csv(path, index=False)


def test_get_planets_returns_paginated_items(tmp_path: Path, monkeypatch) -> None:
    dataset_path = tmp_path / "planets.csv"
    write_dataset(
        dataset_path,
        [
            {
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
            },
            {
                "rowid": 2,
                "pl_name": "Proxima Cen b",
                "hostname": "Proxima Cen",
                "discoverymethod": "Radial Velocity",
                "disc_year": 2016,
                "pl_orbper": 11.1868,
                "pl_orbsmax": 0.0485,
                "pl_rade": 1.1,
                "pl_bmasse": 1.27,
                "pl_dens": None,
                "pl_eqt": 234,
                "st_teff": 2900,
                "st_rad": 0.14,
                "st_mass": 0.12,
                "st_spectype": "M5.5 Ve",
                "ra": 217.4292,
                "dec": -62.6795,
                "sy_dist": 1.30119,
            },
        ],
    )
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    client = TestClient(create_app())

    response = client.get("/api/planets", params={"q": "cen", "limit": 1})

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": 2,
                "planet_name": "Proxima Cen b",
                "host_name": "Proxima Cen",
                "discovery_method": "Radial Velocity",
                "discovery_year": 2016,
                "orbital_period_days": 11.1868,
                "radius_earth": 1.1,
                "mass_earth": 1.27,
                "distance_parsec": 1.30119,
            }
        ],
        "total": 1,
        "limit": 1,
        "offset": 0,
    }
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_planets_validates_limit() -> None:
    client = TestClient(create_app())

    response = client.get("/api/planets", params={"limit": 501})

    assert response.status_code == 422
