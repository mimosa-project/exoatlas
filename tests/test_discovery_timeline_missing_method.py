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
        "pl_name": "A b",
        "hostname": "A",
        "discoverymethod": "Transit",
        "disc_year": 2010,
    },
    {"rowid": 2, "pl_name": "B b", "hostname": "B", "discoverymethod": None, "disc_year": 2010},
    {"rowid": 3, "pl_name": "C b", "hostname": "C", "discoverymethod": None, "disc_year": 2010},
    {"rowid": 4, "pl_name": "D b", "hostname": "D", "discoverymethod": None, "disc_year": 2012},
]


def make_dataframe() -> pd.DataFrame:
    return normalize_composite_dataset(pd.DataFrame(ROWS, columns=REQUIRED_COLUMNS))


def test_timeline_groups_missing_methods_as_none() -> None:
    items = discovery_timeline(make_dataframe(), group_by_method=True)

    assert sorted(items, key=lambda item: (item["year"], str(item["discovery_method"]))) == [
        {"year": 2010, "discovery_method": None, "count": 2},
        {"year": 2010, "discovery_method": "Transit", "count": 1},
        {"year": 2012, "discovery_method": None, "count": 1},
    ]


def test_timeline_without_grouping_is_unchanged_with_missing_methods() -> None:
    items = discovery_timeline(make_dataframe(), group_by_method=False)

    assert items == [
        {"year": 2010, "discovery_method": None, "count": 3},
        {"year": 2012, "discovery_method": None, "count": 1},
    ]


def test_timeline_api_returns_null_for_missing_methods(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    dataset_path = tmp_path / "planets.csv"
    pd.DataFrame(ROWS, columns=REQUIRED_COLUMNS).to_csv(dataset_path, index=False)
    clear_composite_dataset_cache()
    get_settings.cache_clear()
    monkeypatch.setenv("EXOATLAS_COMPOSITE_CSV", dataset_path.as_posix())
    try:
        response = TestClient(create_app()).get("/api/discoveries/timeline")

        assert response.status_code == 200
        items = response.json()["items"]
        assert {"year": 2010, "discovery_method": None, "count": 2} in items
        assert {"year": 2012, "discovery_method": None, "count": 1} in items
    finally:
        clear_composite_dataset_cache()
        get_settings.cache_clear()
