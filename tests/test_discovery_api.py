from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from backend.exoatlas_api.config import get_settings
from backend.exoatlas_api.main import create_app
from backend.exoatlas_api.services.dataset import REQUIRED_COLUMNS, clear_composite_dataset_cache


def write_dataset(path: Path, rows: list[dict[str, object]]) -> None:
    pd.DataFrame(rows, columns=REQUIRED_COLUMNS).to_csv(path, index=False)


def test_get_discovery_timeline_returns_items(tmp_path: Path, monkeypatch) -> None:
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
            {
                "rowid": 3,
                "pl_name": "51 Peg b",
                "hostname": "51 Peg",
                "discoverymethod": "Radial Velocity",
                "disc_year": 1995,
                "pl_orbper": 4.2308,
                "pl_orbsmax": 0.0527,
                "pl_rade": 13.9,
                "pl_bmasse": 150.0,
                "pl_dens": None,
                "pl_eqt": 1255,
                "st_teff": 5793,
                "st_rad": 1.2,
                "st_mass": 1.1,
                "st_spectype": "G2 IV",
                "ra": 344.366,
                "dec": 20.7688,
                "sy_dist": 15.4614,
            },
        ],
    )
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    client = TestClient(create_app())

    response = client.get("/api/discoveries/timeline")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 3
    assert all("year" in item and "count" in item for item in data["items"])
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_discovery_methods_returns_items(tmp_path: Path, monkeypatch) -> None:
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

    response = client.get("/api/discovery-methods")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 2
    assert all("discovery_method" in item and "count" in item for item in data["items"])
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_scatter_orbit_radius_returns_items(tmp_path: Path, monkeypatch) -> None:
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
        ],
    )
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    client = TestClient(create_app())

    response = client.get("/api/scatter/orbit-radius")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["planet_name"] == "Kepler-22 b"
    assert item["orbital_period_days"] == 289.8623
    assert item["radius_earth"] == 2.1
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_scatter_orbit_radius_with_mass_axis(tmp_path: Path, monkeypatch) -> None:
    dataset_path = tmp_path / "planets.csv"
    write_dataset(
        dataset_path,
        [
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

    response = client.get("/api/scatter/orbit-radius", params={"y_axis": "mass"})

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["planet_name"] == "Proxima Cen b"
    assert item["orbital_period_days"] == 11.1868
    assert item["mass_earth"] == 1.27
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_scatter_orbit_radius_rejects_invalid_y_axis(tmp_path: Path, monkeypatch) -> None:
    dataset_path = tmp_path / "planets.csv"
    write_dataset(dataset_path, [])
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    client = TestClient(create_app())

    response = client.get("/api/scatter/orbit-radius", params={"y_axis": "invalid"})

    assert response.status_code == 422
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_sky_map_returns_items(tmp_path: Path, monkeypatch) -> None:
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
        ],
    )
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    client = TestClient(create_app())

    response = client.get("/api/sky-map")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["planet_name"] == "Kepler-22 b"
    assert item["right_ascension"] == 285.679421
    assert item["declination"] == 47.897
    assert item["distance_parsec"] == 194.697
    clear_composite_dataset_cache()
    get_settings.cache_clear()


def test_get_planets_with_distance_filter(tmp_path: Path, monkeypatch) -> None:
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

    response = client.get("/api/planets", params={"distance_max": 50.0})

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["planet_name"] == "Proxima Cen b"
    clear_composite_dataset_cache()
    get_settings.cache_clear()
