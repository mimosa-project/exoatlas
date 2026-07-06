export type HealthResponse = {
  status: string
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type PlanetListItem = {
  id: number | null
  planet_name: string | null
  host_name: string | null
  discovery_method: string | null
  discovery_year: number | null
  orbital_period_days: number | null
  radius_earth: number | null
  mass_earth: number | null
  distance_parsec: number | null
}

export type PlanetListResponse = PaginatedResponse<PlanetListItem>

export type PlanetOrbit = {
  orbital_period_days: number | null
  semi_major_axis_au: number | null
}

export type PlanetPhysical = {
  radius_earth: number | null
  mass_earth: number | null
  density: number | null
  equilibrium_temperature: number | null
}

export type PlanetStar = {
  stellar_temperature: number | null
  stellar_radius: number | null
  stellar_mass: number | null
  stellar_spectral_type: string | null
}

export type PlanetPosition = {
  right_ascension: number | null
  declination: number | null
  distance_parsec: number | null
}

export type PlanetDetail = {
  id: number | null
  planet_name: string | null
  host_name: string | null
  discovery_method: string | null
  discovery_year: number | null
  orbit: PlanetOrbit
  planet: PlanetPhysical
  star: PlanetStar
  position: PlanetPosition
}

export type DiscoveryTimelineItem = {
  year: number | null
  discovery_method: string | null
  count: number
}

export type DiscoveryTimelineResponse = {
  items: DiscoveryTimelineItem[]
}

export type DiscoveryMethodItem = {
  discovery_method: string
  count: number
}

export type DiscoveryMethodsResponse = {
  items: DiscoveryMethodItem[]
}

export type DiscoveryMethodsQueryParams = {
  disc_year_min?: number
  disc_year_max?: number
}

export type ScatterOrbitRadiusItem = {
  id: number | null
  planet_name: string | null
  host_name: string | null
  discovery_method: string | null
  discovery_year: number | null
  orbital_period_days: number | null
  radius_earth: number | null
  mass_earth: number | null
}

export type ScatterOrbitRadiusResponse = {
  items: ScatterOrbitRadiusItem[]
}

export type SkyMapItem = {
  id: number | null
  planet_name: string | null
  host_name: string | null
  discovery_method: string | null
  discovery_year: number | null
  right_ascension: number | null
  declination: number | null
  distance_parsec: number | null
}

export type SkyMapResponse = {
  items: SkyMapItem[]
}

export type SortOrder = 'asc' | 'desc'

export type PlanetSortField =
  | 'id'
  | 'planet_name'
  | 'host_name'
  | 'discovery_method'
  | 'discovery_year'
  | 'orbital_period_days'
  | 'radius_earth'
  | 'mass_earth'
  | 'distance_parsec'

export type ScatterYAxis = 'radius' | 'mass'

export type PaginationParams = {
  limit?: number
  offset?: number
}

export type PlanetListQueryParams = PaginationParams & {
  q?: string
  discovery_method?: string
  disc_year_min?: number
  disc_year_max?: number
  radius_min?: number
  radius_max?: number
  mass_min?: number
  mass_max?: number
  orbital_period_min?: number
  orbital_period_max?: number
  distance_min?: number
  distance_max?: number
  habitable_candidate?: boolean
  sort?: PlanetSortField
  order?: SortOrder
}

export type ChartFilterQueryParams = {
  discovery_method?: string
  disc_year_min?: number
  disc_year_max?: number
  distance_min?: number
  distance_max?: number
}

export type DiscoveryTimelineQueryParams = ChartFilterQueryParams & {
  group_by_method?: boolean
}

export type ScatterOrbitRadiusQueryParams = ChartFilterQueryParams & {
  y_axis?: ScatterYAxis
}

export type SkyMapQueryParams = ChartFilterQueryParams
