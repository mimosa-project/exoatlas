import pandas as pd

from backend.exoatlas_api.utils.dataframe import (
    PLANET_FIELD_MAP,
    PLANET_LIST_FIELDS,
    dataframe_to_api_records,
)

SORTABLE_FIELDS = frozenset(PLANET_LIST_FIELDS)
SORT_ORDERS = frozenset(("asc", "desc"))


class PlanetQueryError(ValueError):
    """Raised when planet query options are invalid."""


def list_planets(
    dataframe: pd.DataFrame,
    *,
    q: str | None = None,
    discovery_method: str | None = None,
    disc_year_min: int | None = None,
    disc_year_max: int | None = None,
    radius_min: float | None = None,
    radius_max: float | None = None,
    mass_min: float | None = None,
    mass_max: float | None = None,
    orbital_period_min: float | None = None,
    orbital_period_max: float | None = None,
    habitable_candidate: bool = False,
    limit: int = 50,
    offset: int = 0,
    sort: str = "planet_name",
    order: str = "asc",
) -> tuple[list[dict[str, object]], int]:
    filtered = filter_planets(
        dataframe,
        q=q,
        discovery_method=discovery_method,
        disc_year_min=disc_year_min,
        disc_year_max=disc_year_max,
        radius_min=radius_min,
        radius_max=radius_max,
        mass_min=mass_min,
        mass_max=mass_max,
        orbital_period_min=orbital_period_min,
        orbital_period_max=orbital_period_max,
        habitable_candidate=habitable_candidate,
    )
    total = len(filtered)
    sorted_dataframe = sort_planets(filtered, sort=sort, order=order)
    page = sorted_dataframe.iloc[offset : offset + limit]

    return dataframe_to_api_records(page, fields=PLANET_LIST_FIELDS), total


def filter_planets(
    dataframe: pd.DataFrame,
    *,
    q: str | None = None,
    discovery_method: str | None = None,
    disc_year_min: int | None = None,
    disc_year_max: int | None = None,
    radius_min: float | None = None,
    radius_max: float | None = None,
    mass_min: float | None = None,
    mass_max: float | None = None,
    orbital_period_min: float | None = None,
    orbital_period_max: float | None = None,
    habitable_candidate: bool = False,
) -> pd.DataFrame:
    filtered = dataframe

    if q:
        query = q.strip()
        if query:
            planet_matches = filtered["pl_name"].str.contains(
                query,
                case=False,
                regex=False,
                na=False,
            )
            host_matches = filtered["hostname"].str.contains(
                query,
                case=False,
                regex=False,
                na=False,
            )
            filtered = filtered[planet_matches | host_matches]

    if discovery_method:
        filtered = filtered[filtered["discoverymethod"] == discovery_method]

    filtered = apply_range_filter(
        filtered,
        "disc_year",
        minimum=disc_year_min,
        maximum=disc_year_max,
    )
    filtered = apply_range_filter(filtered, "pl_rade", minimum=radius_min, maximum=radius_max)
    filtered = apply_range_filter(filtered, "pl_bmasse", minimum=mass_min, maximum=mass_max)
    filtered = apply_range_filter(
        filtered,
        "pl_orbper",
        minimum=orbital_period_min,
        maximum=orbital_period_max,
    )

    if habitable_candidate:
        filtered = filtered[
            filtered["pl_rade"].between(0.5, 2.0, inclusive="both")
            & filtered["pl_eqt"].between(180, 320, inclusive="both")
            & (filtered["pl_orbper"].notna() | filtered["pl_orbsmax"].notna())
        ]

    return filtered


def apply_range_filter(
    dataframe: pd.DataFrame,
    column: str,
    *,
    minimum: int | float | None = None,
    maximum: int | float | None = None,
) -> pd.DataFrame:
    filtered = dataframe

    if minimum is not None:
        filtered = filtered[filtered[column] >= minimum]

    if maximum is not None:
        filtered = filtered[filtered[column] <= maximum]

    return filtered


def sort_planets(dataframe: pd.DataFrame, *, sort: str, order: str) -> pd.DataFrame:
    if sort not in SORTABLE_FIELDS:
        msg = f"Unsupported sort field: {sort}"
        raise PlanetQueryError(msg)

    if order not in SORT_ORDERS:
        msg = f"Unsupported sort order: {order}"
        raise PlanetQueryError(msg)

    source_column = PLANET_FIELD_MAP[sort]
    return dataframe.sort_values(
        by=source_column,
        ascending=order == "asc",
        na_position="last",
        kind="mergesort",
    )
