from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.exoatlas_api.config import get_settings
from backend.exoatlas_api.main import create_app
from backend.exoatlas_api.services.dataset import (
    REQUIRED_COLUMNS,
    clear_composite_dataset_cache,
    normalize_composite_dataset,
)
from backend.exoatlas_api.services.planets import discovery_timeline

ROWS: list[dict[str, object]] = [
    {
        "rowid": 1,
        "pl_name": "Near b",
        "hostname": "Near",
        "discoverymethod": "Transit",
        "disc_year": 2010,
        "sy_dist": 10.0,
    },
    {
        "rowid": 2,
        "pl_name": "Middle b",
        "hostname": "Middle",
        "discoverymethod": "Transit",
        "disc_year": 2010,
        "sy_dist": 100.0,
    },
    {
        "rowid": 3,
        "pl_name": "Far b",
        "hostname": "Far",
        "discoverymethod": "Radial Velocity",
        "disc_year": 2012,
        "sy_dist": 1000.0,
    },
    {
        "rowid": 4,
        "pl_name": "Unknown distance b",
        "hostname": "Unknown",
        "discoverymethod": "Imaging",
        "disc_year": 2012,
        "sy_dist": None,
    },
]


def make_dataframe() -> pd.DataFrame:
    return normalize_composite_dataset(pd.DataFrame(ROWS, columns=REQUIRED_COLUMNS))


def as_counts(items: list[dict[str, object]]) -> dict[tuple[object, object], object]:
    return {(item["year"], item["discovery_method"]): item["count"] for item in items}


def test_timeline_without_distance_params_is_unchanged() -> None:
    items = discovery_timeline(make_dataframe())

    assert as_counts(items) == {
        (2010, "Transit"): 2,
        (2012, "Imaging"): 1,
        (2012, "Radial Velocity"): 1,
    }


def test_timeline_filters_by_distance_range_inclusive() -> None:
    items = discovery_timeline(make_dataframe(), distance_min=10.0, distance_max=100.0)

    assert as_counts(items) == {(2010, "Transit"): 2}


def test_timeline_filters_by_distance_min_only_and_excludes_missing_distance() -> None:
    items = discovery_timeline(make_dataframe(), distance_min=50.0)

    assert as_counts(items) == {
        (2010, "Transit"): 1,
        (2012, "Radial Velocity"): 1,
    }


def test_timeline_filters_by_distance_max_only() -> None:
    items = discovery_timeline(make_dataframe(), distance_max=10.0)

    assert as_counts(items) == {(2010, "Transit"): 1}


def test_timeline_distance_combines_with_other_filters() -> None:
    items = discovery_timeline(
        make_dataframe(),
        discovery_method="Transit",
        disc_year_min=2010,
        disc_year_max=2010,
        distance_min=50.0,
    )

    assert as_counts(items) == {(2010, "Transit"): 1}


def test_timeline_distance_min_greater_than_max_returns_empty() -> None:
    assert discovery_timeline(make_dataframe(), distance_min=500.0, distance_max=5.0) == []


def make_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    dataset_path = tmp_path / "planets.csv"
    pd.DataFrame(ROWS, columns=REQUIRED_COLUMNS).to_csv(dataset_path, index=False)
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    return TestClient(create_app())


def test_timeline_api_accepts_distance_params(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = make_client(tmp_path, monkeypatch)
    try:
        response = client.get(
            "/api/discoveries/timeline",
            params={"distance_min": 50, "distance_max": 2000},
        )

        assert response.status_code == 200
        assert as_counts(response.json()["items"]) == {
            (2010, "Transit"): 1,
            (2012, "Radial Velocity"): 1,
        }
    finally:
        clear_composite_dataset_cache()
        get_settings.cache_clear()


def test_timeline_api_without_distance_params_is_unchanged(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = make_client(tmp_path, monkeypatch)
    try:
        response = client.get("/api/discoveries/timeline")

        assert response.status_code == 200
        assert len(response.json()["items"]) == 3
    finally:
        clear_composite_dataset_cache()
        get_settings.cache_clear()


@pytest.mark.parametrize("param", ["distance_min", "distance_max"])
def test_timeline_api_rejects_non_numeric_distance(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, param: str
) -> None:
    client = make_client(tmp_path, monkeypatch)
    try:
        response = client.get("/api/discoveries/timeline", params={param: "far"})

        assert response.status_code == 422
    finally:
        clear_composite_dataset_cache()
        get_settings.cache_clear()


def test_timeline_distance_applies_without_method_grouping() -> None:
    items = discovery_timeline(
        make_dataframe(),
        group_by_method=False,
        distance_min=50.0,
    )

    assert as_counts(items) == {
        (2010, None): 1,
        (2012, None): 1,
    }


def test_timeline_api_applies_distance_max_only(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = make_client(tmp_path, monkeypatch)
    try:
        response = client.get("/api/discoveries/timeline", params={"distance_max": 500})

        assert response.status_code == 200
        assert as_counts(response.json()["items"]) == {(2010, "Transit"): 2}
    finally:
        clear_composite_dataset_cache()
        get_settings.cache_clear()


def test_timeline_api_applies_distance_without_method_grouping(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = make_client(tmp_path, monkeypatch)
    try:
        response = client.get(
            "/api/discoveries/timeline",
            params={"distance_min": 50, "group_by_method": "false"},
        )

        assert response.status_code == 200
        assert as_counts(response.json()["items"]) == {(2010, None): 1, (2012, None): 1}
    finally:
        clear_composite_dataset_cache()
        get_settings.cache_clear()
