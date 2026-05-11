from pathlib import Path

import pandas as pd
import pytest

from backend.exoatlas_api.config import Settings
from backend.exoatlas_api.services.dataset import (
    DatasetNotFoundError,
    DatasetSchemaError,
    clear_composite_dataset_cache,
    get_composite_dataset,
    load_composite_dataset,
)

CSV_COLUMNS = [
    "rowid",
    "pl_name",
    "hostname",
    "discoverymethod",
    "disc_year",
    "pl_orbper",
    "pl_orbsmax",
    "pl_rade",
    "pl_bmasse",
    "pl_dens",
    "pl_eqt",
    "st_teff",
    "st_rad",
    "st_mass",
    "st_spectype",
    "ra",
    "dec",
    "sy_dist",
]


def write_dataset(path: Path, rows: list[dict[str, object]]) -> None:
    pd.DataFrame(rows, columns=CSV_COLUMNS).to_csv(path, index=False)


def test_load_composite_dataset_normalizes_required_columns(tmp_path: Path) -> None:
    dataset_path = tmp_path / "planets.csv"
    write_dataset(
        dataset_path,
        [
            {
                "rowid": "1",
                "pl_name": "  Kepler-22 b  ",
                "hostname": " Kepler-22 ",
                "discoverymethod": " Transit ",
                "disc_year": "2011",
                "pl_orbper": "289.8623",
                "pl_orbsmax": "0.849",
                "pl_rade": "2.1",
                "pl_bmasse": "",
                "pl_dens": "",
                "pl_eqt": "262",
                "st_teff": "5518",
                "st_rad": "0.979",
                "st_mass": "0.97",
                "st_spectype": " G5 ",
                "ra": "285.679421",
                "dec": "47.897",
                "sy_dist": "194.697",
            }
        ],
    )

    dataframe = load_composite_dataset(dataset_path)

    assert dataframe.loc[0, "rowid"] == 1
    assert dataframe.loc[0, "disc_year"] == 2011
    assert dataframe.loc[0, "pl_name"] == "Kepler-22 b"
    assert dataframe.loc[0, "hostname"] == "Kepler-22"
    assert dataframe.loc[0, "discoverymethod"] == "Transit"
    assert dataframe.loc[0, "st_spectype"] == "G5"
    assert dataframe.loc[0, "pl_orbper"] == pytest.approx(289.8623)
    assert pd.isna(dataframe.loc[0, "pl_bmasse"])


def test_load_composite_dataset_raises_when_file_is_missing(tmp_path: Path) -> None:
    with pytest.raises(DatasetNotFoundError, match="Composite dataset not found"):
        load_composite_dataset(tmp_path / "missing.csv")


def test_load_composite_dataset_raises_when_required_column_is_missing(tmp_path: Path) -> None:
    dataset_path = tmp_path / "planets.csv"
    pd.DataFrame([{"rowid": 1, "pl_name": "Kepler-22 b"}]).to_csv(dataset_path, index=False)

    with pytest.raises(DatasetSchemaError, match="hostname"):
        load_composite_dataset(dataset_path)


def test_get_composite_dataset_returns_copy_of_cached_dataframe(tmp_path: Path) -> None:
    clear_composite_dataset_cache()
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
            }
        ],
    )
    settings = Settings(composite_csv_path=dataset_path)

    first_dataframe = get_composite_dataset(settings)
    first_dataframe.loc[0, "pl_name"] = "Changed"
    second_dataframe = get_composite_dataset(settings)

    assert second_dataframe.loc[0, "pl_name"] == "Kepler-22 b"
    clear_composite_dataset_cache()
