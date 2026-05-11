from pathlib import Path

import exoatlas


def test_package_version_is_defined() -> None:
    assert exoatlas.__version__


def test_composite_dataset_exists() -> None:
    project_root = Path(__file__).resolve().parents[1]
    dataset_path = project_root / "dataset" / "NASA_Exoplanet_Composite.csv"

    assert dataset_path.exists()
