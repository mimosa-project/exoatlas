from functools import lru_cache
from pathlib import Path

import pandas as pd

from backend.exoatlas_api.config import Settings, get_settings

REQUIRED_COLUMNS = (
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
)

INTEGER_COLUMNS = ("rowid", "disc_year")

FLOAT_COLUMNS = (
    "pl_orbper",
    "pl_orbsmax",
    "pl_rade",
    "pl_bmasse",
    "pl_dens",
    "pl_eqt",
    "st_teff",
    "st_rad",
    "st_mass",
    "ra",
    "dec",
    "sy_dist",
)

TEXT_COLUMNS = ("pl_name", "hostname", "discoverymethod", "st_spectype")


class DatasetError(RuntimeError):
    """Base exception for dataset loading failures."""


class DatasetNotFoundError(DatasetError):
    """Raised when the configured dataset CSV does not exist."""


class DatasetSchemaError(DatasetError):
    """Raised when the dataset does not contain the required columns."""


def load_composite_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        msg = f"Composite dataset not found: {path}"
        raise DatasetNotFoundError(msg)

    dataframe = pd.read_csv(path)
    validate_composite_columns(dataframe)

    return normalize_composite_dataset(dataframe)


def get_composite_dataset(settings: Settings | None = None) -> pd.DataFrame:
    resolved_settings = settings or get_settings()
    dataframe = _load_cached_composite_dataset(resolved_settings.dataset_path.as_posix())

    return dataframe.copy()


def clear_composite_dataset_cache() -> None:
    _load_cached_composite_dataset.cache_clear()


@lru_cache
def _load_cached_composite_dataset(path: str) -> pd.DataFrame:
    return load_composite_dataset(Path(path))


def validate_composite_columns(dataframe: pd.DataFrame) -> None:
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in dataframe.columns]
    if missing_columns:
        joined_columns = ", ".join(missing_columns)
        msg = f"Composite dataset is missing required columns: {joined_columns}"
        raise DatasetSchemaError(msg)


def normalize_composite_dataset(dataframe: pd.DataFrame) -> pd.DataFrame:
    normalized = dataframe.copy()

    for column in INTEGER_COLUMNS:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce").astype("Int64")

    for column in FLOAT_COLUMNS:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")

    for column in TEXT_COLUMNS:
        normalized[column] = normalized[column].astype("string").str.strip().replace("", pd.NA)

    return normalized
