import pandas as pd
import pytest

from backend.exoatlas_api.utils.dataframe import (
    PLANET_LIST_FIELDS,
    DataFrameConversionError,
    dataframe_to_api_records,
    series_to_api_record,
    to_api_value,
)


def test_dataframe_to_api_records_maps_csv_columns_to_api_fields() -> None:
    dataframe = pd.DataFrame(
        [
            {
                "rowid": 1,
                "pl_name": "11 Com b",
                "hostname": "11 Com",
                "discoverymethod": "Radial Velocity",
                "disc_year": 2007,
                "pl_orbper": 326.03,
                "pl_rade": 12.1,
                "pl_bmasse": 6165.6,
                "sy_dist": 93.1846,
            }
        ],
    )

    records = dataframe_to_api_records(dataframe, fields=PLANET_LIST_FIELDS)

    assert records == [
        {
            "id": 1,
            "planet_name": "11 Com b",
            "host_name": "11 Com",
            "discovery_method": "Radial Velocity",
            "discovery_year": 2007,
            "orbital_period_days": 326.03,
            "radius_earth": 12.1,
            "mass_earth": 6165.6,
            "distance_parsec": 93.1846,
        }
    ]


def test_series_to_api_record_converts_missing_values_to_none() -> None:
    series = pd.Series(
        {
            "rowid": 1,
            "pl_name": "Kepler-22 b",
            "hostname": "Kepler-22",
            "discoverymethod": "Transit",
            "disc_year": pd.NA,
            "pl_orbper": 289.8623,
            "pl_rade": 2.1,
            "pl_bmasse": float("nan"),
            "sy_dist": 194.697,
        }
    )

    record = series_to_api_record(series, fields=PLANET_LIST_FIELDS)

    assert record["discovery_year"] is None
    assert record["mass_earth"] is None


def test_dataframe_to_api_records_raises_for_unknown_api_field() -> None:
    dataframe = pd.DataFrame([{"rowid": 1}])

    with pytest.raises(DataFrameConversionError, match="Unknown API fields"):
        dataframe_to_api_records(dataframe, fields=("unknown",))


def test_dataframe_to_api_records_raises_for_missing_source_column() -> None:
    dataframe = pd.DataFrame([{"rowid": 1}])

    with pytest.raises(DataFrameConversionError, match="pl_name"):
        dataframe_to_api_records(dataframe, fields=("id", "planet_name"))


def test_to_api_value_converts_pandas_scalar_to_python_scalar() -> None:
    value = pd.Series([1], dtype="Int64").iloc[0]

    assert to_api_value(value) == 1
    assert type(to_api_value(value)) is int
