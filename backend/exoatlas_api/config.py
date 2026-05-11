from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field


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
    return Settings()
