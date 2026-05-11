from collections.abc import Mapping, Sequence
from typing import Any

import pandas as pd

PLANET_FIELD_MAP: dict[str, str] = {
    "id": "rowid",
    "planet_name": "pl_name",
    "host_name": "hostname",
    "discovery_method": "discoverymethod",
    "discovery_year": "disc_year",
    "orbital_period_days": "pl_orbper",
    "semi_major_axis_au": "pl_orbsmax",
    "radius_earth": "pl_rade",
    "mass_earth": "pl_bmasse",
    "density": "pl_dens",
    "equilibrium_temperature": "pl_eqt",
    "stellar_temperature": "st_teff",
    "stellar_radius": "st_rad",
    "stellar_mass": "st_mass",
    "stellar_spectral_type": "st_spectype",
    "right_ascension": "ra",
    "declination": "dec",
    "distance_parsec": "sy_dist",
}

PLANET_LIST_FIELDS = (
    "id",
    "planet_name",
    "host_name",
    "discovery_method",
    "discovery_year",
    "orbital_period_days",
    "radius_earth",
    "mass_earth",
    "distance_parsec",
)

PLANET_DETAIL_FIELDS = tuple(PLANET_FIELD_MAP)


class DataFrameConversionError(ValueError):
    """Raised when a DataFrame cannot be converted to API fields."""


def dataframe_to_api_records(
    dataframe: pd.DataFrame,
    fields: Sequence[str] = PLANET_DETAIL_FIELDS,
    field_map: Mapping[str, str] = PLANET_FIELD_MAP,
) -> list[dict[str, Any]]:
    validate_api_fields(dataframe, fields, field_map)

    return [series_to_api_record(row, fields, field_map) for _, row in dataframe.iterrows()]


def series_to_api_record(
    series: pd.Series,
    fields: Sequence[str] = PLANET_DETAIL_FIELDS,
    field_map: Mapping[str, str] = PLANET_FIELD_MAP,
) -> dict[str, Any]:
    validate_api_fields(series.to_frame().T, fields, field_map)

    return {api_field: to_api_value(series[field_map[api_field]]) for api_field in fields}


def validate_api_fields(
    dataframe: pd.DataFrame,
    fields: Sequence[str],
    field_map: Mapping[str, str] = PLANET_FIELD_MAP,
) -> None:
    unknown_fields = [field for field in fields if field not in field_map]
    if unknown_fields:
        joined_fields = ", ".join(unknown_fields)
        msg = f"Unknown API fields: {joined_fields}"
        raise DataFrameConversionError(msg)

    missing_columns = [
        field_map[field] for field in fields if field_map[field] not in dataframe.columns
    ]
    if missing_columns:
        joined_columns = ", ".join(missing_columns)
        msg = f"DataFrame is missing source columns: {joined_columns}"
        raise DataFrameConversionError(msg)


def to_api_value(value: Any) -> Any:
    if pd.isna(value):
        return None

    if hasattr(value, "item"):
        return value.item()

    return value
