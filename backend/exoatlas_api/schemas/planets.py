from pydantic import BaseModel


class PlanetListItem(BaseModel):
    id: int | None
    planet_name: str | None
    host_name: str | None
    discovery_method: str | None
    discovery_year: int | None
    orbital_period_days: float | None
    radius_earth: float | None
    mass_earth: float | None
    distance_parsec: float | None
