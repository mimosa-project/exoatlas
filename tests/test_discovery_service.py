import pandas as pd

from backend.exoatlas_api.services.dataset import normalize_composite_dataset
from backend.exoatlas_api.services.planets import (
    discovery_methods,
    discovery_timeline,
    scatter_orbit_radius,
    sky_map,
)


def make_planets_dataframe() -> pd.DataFrame:
    return normalize_composite_dataset(
        pd.DataFrame(
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
            ]
        )
    )


def test_discovery_timeline_returns_items() -> None:
    items = discovery_timeline(make_planets_dataframe())

    assert len(items) > 0
    assert all("year" in item and "count" in item for item in items)


def test_discovery_timeline_filters_by_method() -> None:
    items = discovery_timeline(make_planets_dataframe(), discovery_method="Transit")

    assert len(items) == 1
    assert items[0]["discovery_method"] == "Transit"


def test_discovery_timeline_groups_by_method() -> None:
    items = discovery_timeline(make_planets_dataframe(), group_by_method=True)

    transit_items = [item for item in items if item["discovery_method"] == "Transit"]
    rv_items = [item for item in items if item["discovery_method"] == "Radial Velocity"]

    assert len(transit_items) > 0
    assert len(rv_items) > 0


def test_discovery_timeline_without_grouping() -> None:
    items = discovery_timeline(make_planets_dataframe(), group_by_method=False)

    assert all(item["discovery_method"] is None for item in items)


def test_discovery_methods_returns_items() -> None:
    items = discovery_methods(make_planets_dataframe())

    assert len(items) == 2
    assert all("discovery_method" in item and "count" in item for item in items)
    assert items[0]["discovery_method"] in ("Transit", "Radial Velocity")


def test_discovery_methods_filters_by_year() -> None:
    items = discovery_methods(make_planets_dataframe(), disc_year_min=2010)

    assert len(items) >= 1
    assert all(item["count"] > 0 for item in items)


def test_scatter_orbit_radius_returns_items() -> None:
    items = scatter_orbit_radius(make_planets_dataframe())

    assert len(items) > 0
    assert all(
        "planet_name" in item
        and "orbital_period_days" in item
        and "radius_earth" in item
        and "mass_earth" in item
        for item in items
    )


def test_scatter_orbit_radius_with_mass_axis() -> None:
    items = scatter_orbit_radius(make_planets_dataframe(), y_axis="mass")

    assert len(items) > 0
    assert all(
        "planet_name" in item
        and "orbital_period_days" in item
        and "radius_earth" in item
        and "mass_earth" in item
        for item in items
    )


def test_scatter_orbit_radius_excludes_null_values() -> None:
    df = make_planets_dataframe()
    items = scatter_orbit_radius(df, y_axis="radius")

    assert len(items) == 3
    assert all(item["orbital_period_days"] is not None for item in items)
    assert all(item["radius_earth"] is not None for item in items)


def test_sky_map_returns_items() -> None:
    items = sky_map(make_planets_dataframe())

    assert len(items) > 0
    assert all(
        "planet_name" in item
        and "right_ascension" in item
        and "declination" in item
        and "distance_parsec" in item
        for item in items
    )


def test_sky_map_filters_by_distance() -> None:
    items = sky_map(make_planets_dataframe(), distance_max=50)

    for item in items:
        if item["distance_parsec"] is not None:
            assert item["distance_parsec"] <= 50


def test_sky_map_excludes_null_coordinates() -> None:
    items = sky_map(make_planets_dataframe())

    assert all(item["right_ascension"] is not None for item in items)
    assert all(item["declination"] is not None for item in items)
