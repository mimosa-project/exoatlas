from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from backend.exoatlas_api.schemas.common import PaginatedResponse
from backend.exoatlas_api.schemas.planets import (
    DiscoveryMethodsResponse,
    DiscoveryTimelineResponse,
    PlanetDetail,
    PlanetListItem,
    ScatterOrbitRadiusResponse,
    SkyMapResponse,
)
from backend.exoatlas_api.services.dataset import DatasetError, get_composite_dataset
from backend.exoatlas_api.services.planets import (
    PlanetQueryError,
    discovery_methods,
    discovery_timeline,
    get_planet,
    list_planets,
    scatter_orbit_radius,
    sky_map,
)

router = APIRouter(prefix="/api", tags=["planets"])


@router.get("/planets", response_model=PaginatedResponse[PlanetListItem])
def read_planets(
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
    distance_min: float | None = None,
    distance_max: float | None = None,
    habitable_candidate: bool = False,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    sort: str = "planet_name",
    order: str = "asc",
) -> PaginatedResponse[PlanetListItem]:
    try:
        items, total = list_planets(
            get_composite_dataset(),
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
            distance_min=distance_min,
            distance_max=distance_max,
            habitable_candidate=habitable_candidate,
            limit=limit,
            offset=offset,
            sort=sort,
            order=order,
        )
    except DatasetError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except PlanetQueryError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    return PaginatedResponse[PlanetListItem](
        items=[PlanetListItem(**item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/discoveries/timeline", response_model=DiscoveryTimelineResponse)
def read_discovery_timeline(
    discovery_method: str | None = None,
    disc_year_min: int | None = None,
    disc_year_max: int | None = None,
    group_by_method: bool = True,
) -> dict[str, object]:
    try:
        items = discovery_timeline(
            get_composite_dataset(),
            discovery_method=discovery_method,
            disc_year_min=disc_year_min,
            disc_year_max=disc_year_max,
            group_by_method=group_by_method,
        )
    except DatasetError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return {"items": items}


@router.get("/discovery-methods", response_model=DiscoveryMethodsResponse)
def read_discovery_methods(
    disc_year_min: int | None = None,
    disc_year_max: int | None = None,
) -> dict[str, object]:
    try:
        items = discovery_methods(
            get_composite_dataset(),
            disc_year_min=disc_year_min,
            disc_year_max=disc_year_max,
        )
    except DatasetError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return {"items": items}


@router.get("/scatter/orbit-radius", response_model=ScatterOrbitRadiusResponse)
def read_scatter_orbit_radius(
    y_axis: str = "radius",
    discovery_method: str | None = None,
    disc_year_min: int | None = None,
    disc_year_max: int | None = None,
    distance_min: float | None = None,
    distance_max: float | None = None,
) -> dict[str, object]:
    try:
        items = scatter_orbit_radius(
            get_composite_dataset(),
            y_axis=y_axis,
            discovery_method=discovery_method,
            disc_year_min=disc_year_min,
            disc_year_max=disc_year_max,
            distance_min=distance_min,
            distance_max=distance_max,
        )
    except DatasetError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except PlanetQueryError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    return {"items": items}


@router.get("/sky-map", response_model=SkyMapResponse)
def read_sky_map(
    discovery_method: str | None = None,
    disc_year_min: int | None = None,
    disc_year_max: int | None = None,
    distance_min: float | None = None,
    distance_max: float | None = None,
) -> dict[str, object]:
    try:
        items = sky_map(
            get_composite_dataset(),
            discovery_method=discovery_method,
            disc_year_min=disc_year_min,
            disc_year_max=disc_year_max,
            distance_min=distance_min,
            distance_max=distance_max,
        )
    except DatasetError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return {"items": items}


@router.get("/planets/{planet_name}", response_model=PlanetDetail)
def read_planet(planet_name: str) -> dict[str, object]:
    try:
        planet = get_planet(get_composite_dataset(), planet_name)
    except DatasetError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    if planet is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planet '{planet_name}' not found",
        )

    return planet

