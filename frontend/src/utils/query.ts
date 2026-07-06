import type {
  ChartFilterQueryParams,
  PlanetListQueryParams,
} from '../types/api'
import type { PaginationState, PlanetFilters } from '../types/filters'

export const DEFAULT_PLANET_FILTERS: PlanetFilters = {
  q: '',
  discoveryMethod: null,
  discoveryYearMin: null,
  discoveryYearMax: null,
  radiusMin: null,
  radiusMax: null,
  massMin: null,
  massMax: null,
  orbitalPeriodMin: null,
  orbitalPeriodMax: null,
  habitableCandidate: false,
}

function appendNumericParam(
  params: Record<string, string | number | boolean>,
  key: string,
  value: number | null,
) {
  if (value != null) {
    params[key] = value
  }
}

export function toPlanetListQueryParams(
  filters: PlanetFilters,
  pagination?: PaginationState,
): PlanetListQueryParams {
  const params: PlanetListQueryParams = {}
  const trimmedQuery = filters.q.trim()

  if (trimmedQuery.length > 0) {
    params.q = trimmedQuery
  }
  if (filters.discoveryMethod) {
    params.discovery_method = filters.discoveryMethod
  }

  appendNumericParam(params, 'disc_year_min', filters.discoveryYearMin)
  appendNumericParam(params, 'disc_year_max', filters.discoveryYearMax)
  appendNumericParam(params, 'radius_min', filters.radiusMin)
  appendNumericParam(params, 'radius_max', filters.radiusMax)
  appendNumericParam(params, 'mass_min', filters.massMin)
  appendNumericParam(params, 'mass_max', filters.massMax)
  appendNumericParam(params, 'orbital_period_min', filters.orbitalPeriodMin)
  appendNumericParam(params, 'orbital_period_max', filters.orbitalPeriodMax)

  if (filters.habitableCandidate) {
    params.habitable_candidate = true
  }

  if (pagination) {
    params.limit = pagination.limit
    params.offset = pagination.offset
  }

  return params
}

export function toChartFilterQueryParams(
  filters: PlanetFilters,
): ChartFilterQueryParams {
  const params: ChartFilterQueryParams = {}

  if (filters.discoveryMethod) {
    params.discovery_method = filters.discoveryMethod
  }

  appendNumericParam(params, 'disc_year_min', filters.discoveryYearMin)
  appendNumericParam(params, 'disc_year_max', filters.discoveryYearMax)

  return params
}

export function hasActiveFilters(filters: PlanetFilters): boolean {
  return (
    filters.q.trim().length > 0 ||
    filters.discoveryMethod != null ||
    filters.discoveryYearMin != null ||
    filters.discoveryYearMax != null ||
    filters.radiusMin != null ||
    filters.radiusMax != null ||
    filters.massMin != null ||
    filters.massMax != null ||
    filters.orbitalPeriodMin != null ||
    filters.orbitalPeriodMax != null ||
    filters.habitableCandidate
  )
}
