import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field

COMPOSITE_CSV_ENV = "EXOATLAS_COMPOSITE_CSV"


class Settings(BaseModel):
    app_name: str = "ExoAtlas API"
    api_prefix: str = "/api"
    project_root: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2])
    composite_csv_path: Path | None = None

    @property
    def dataset_path(self) -> Path:
        if self.composite_csv_path is not None:
            return self.composite_csv_path

        return self.project_root / "dataset" / "NASA_Exoplanet_Composite.csv"


@lru_cache
def get_settings() -> Settings:
    composite_csv = os.getenv(COMPOSITE_CSV_ENV)
    composite_csv_path = Path(composite_csv) if composite_csv else None

    return Settings(composite_csv_path=composite_csv_path)
