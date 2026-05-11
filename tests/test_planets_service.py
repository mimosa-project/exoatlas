import pandas as pd

from backend.exoatlas_api.services.dataset import normalize_composite_dataset
from backend.exoatlas_api.services.planets import list_planets


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


def test_list_planets_filters_by_search_query() -> None:
    items, total = list_planets(make_planets_dataframe(), q="proxima")

    assert total == 1
    assert items[0]["planet_name"] == "Proxima Cen b"


def test_list_planets_filters_by_ranges_and_method() -> None:
    items, total = list_planets(
        make_planets_dataframe(),
        discovery_method="Radial Velocity",
        disc_year_min=1990,
        disc_year_max=2000,
        radius_min=10,
    )

    assert total == 1
    assert items[0]["planet_name"] == "51 Peg b"


def test_list_planets_filters_habitable_candidates() -> None:
    items, total = list_planets(make_planets_dataframe(), habitable_candidate=True)

    assert total == 1
    assert items[0]["planet_name"] == "Proxima Cen b"


def test_list_planets_pages_and_sorts_results() -> None:
    items, total = list_planets(
        make_planets_dataframe(),
        sort="discovery_year",
        order="desc",
        limit=1,
        offset=1,
    )

    assert total == 3
    assert len(items) == 1
    assert items[0]["planet_name"] == "Kepler-22 b"
