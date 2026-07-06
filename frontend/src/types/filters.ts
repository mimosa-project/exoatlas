import type { PlanetSortField, ScatterYAxis, SortOrder } from './api'

export type PlanetFilters = {
  q: string
  discoveryMethod: string | null
  discoveryYearMin: number | null
  discoveryYearMax: number | null
  radiusMin: number | null
  radiusMax: number | null
  massMin: number | null
  massMax: number | null
  orbitalPeriodMin: number | null
  orbitalPeriodMax: number | null
  habitableCandidate: boolean
}

export type PaginationState = {
  limit: number
  offset: number
}

export type PlanetTableSort = {
  sort: PlanetSortField
  order: SortOrder
}

export type ScatterPlotState = {
  yAxis: ScatterYAxis
}
