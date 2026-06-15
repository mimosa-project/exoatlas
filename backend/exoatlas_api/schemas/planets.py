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


class PlanetOrbit(BaseModel):
    orbital_period_days: float | None
    semi_major_axis_au: float | None


class PlanetPhysical(BaseModel):
    radius_earth: float | None
    mass_earth: float | None
    density: float | None
    equilibrium_temperature: float | None


class PlanetStar(BaseModel):
    stellar_temperature: float | None
    stellar_radius: float | None
    stellar_mass: float | None
    stellar_spectral_type: str | None


class PlanetPosition(BaseModel):
    right_ascension: float | None
    declination: float | None
    distance_parsec: float | None


class PlanetDetail(BaseModel):
    id: int | None
    planet_name: str | None
    host_name: str | None
    discovery_method: str | None
    discovery_year: int | None
    orbit: PlanetOrbit
    planet: PlanetPhysical
    star: PlanetStar
    position: PlanetPosition


class DiscoveryTimelineItem(BaseModel):
    year: int | None
    discovery_method: str | None = None
    count: int


class DiscoveryTimelineResponse(BaseModel):
    items: list[DiscoveryTimelineItem]


class DiscoveryMethodItem(BaseModel):
    discovery_method: str
    count: int


class DiscoveryMethodsResponse(BaseModel):
    items: list[DiscoveryMethodItem]


class ScatterOrbitRadiusItem(BaseModel):
    id: int | None
    planet_name: str | None
    host_name: str | None
    discovery_method: str | None
    discovery_year: int | None
    orbital_period_days: float | None
    radius_earth: float | None
    mass_earth: float | None


class ScatterOrbitRadiusResponse(BaseModel):
    items: list[ScatterOrbitRadiusItem]


class SkyMapItem(BaseModel):
    id: int | None
    planet_name: str | None
    host_name: str | None
    discovery_method: str | None
    discovery_year: int | None
    right_ascension: float | None
    declination: float | None
    distance_parsec: float | None


class SkyMapResponse(BaseModel):
    items: list[SkyMapItem]


class DiscoveryTimelineItem(BaseModel):
    year: int | None
    discovery_method: str | None = None
    count: int


class DiscoveryMethodItem(BaseModel):
    discovery_method: str
    count: int


class ScatterOrbitRadiusItem(BaseModel):
    id: int | None
    planet_name: str | None
    host_name: str | None
    discovery_method: str | None
    discovery_year: int | None
    orbital_period_days: float | None
    radius_earth: float | None
    mass_earth: float | None


class SkyMapItem(BaseModel):
    id: int | None
    planet_name: str | None
    host_name: str | None
    discovery_method: str | None
    discovery_year: int | None
    right_ascension: float | None
    declination: float | None
    distance_parsec: float | None

