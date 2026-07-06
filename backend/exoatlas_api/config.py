import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field

COMPOSITE_CSV_ENV = "EXOATLAS_COMPOSITE_CSV"
CORS_ORIGINS_ENV = "EXOATLAS_CORS_ORIGINS"

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


class Settings(BaseModel):
    app_name: str = "ExoAtlas API"
    api_prefix: str = "/api"
    project_root: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2])
    composite_csv_path: Path | None = None
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS

    @property
    def dataset_path(self) -> Path:
        if self.composite_csv_path is not None:
            return self.composite_csv_path

        return self.project_root / "dataset" / "NASA_Exoplanet_Composite.csv"


def _parse_cors_origins(value: str | None) -> tuple[str, ...]:
    if value is None:
        return DEFAULT_CORS_ORIGINS

    origins = tuple(origin.strip() for origin in value.split(",") if origin.strip())
    return origins or DEFAULT_CORS_ORIGINS


@lru_cache
def get_settings() -> Settings:
    composite_csv = os.getenv(COMPOSITE_CSV_ENV)
    composite_csv_path = Path(composite_csv) if composite_csv else None

    return Settings(
        composite_csv_path=composite_csv_path,
        cors_origins=_parse_cors_origins(os.getenv(CORS_ORIGINS_ENV)),
    )
