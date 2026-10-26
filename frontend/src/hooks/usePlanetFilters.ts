import { useCallback, useMemo, useState } from 'react'
import type { PlanetFilters } from '../types/filters'
import {
  DEFAULT_PLANET_FILTERS,
  toChartFilterQueryParams,
  toPlanetListQueryParams,
} from '../utils/query'
import { useDebouncedValue } from './useDebouncedValue'

type NumericFilters = Pick<
  PlanetFilters,
  | 'discoveryYearMin'
  | 'discoveryYearMax'
  | 'radiusMin'
  | 'radiusMax'
  | 'massMin'
  | 'massMax'
  | 'orbitalPeriodMin'
  | 'orbitalPeriodMax'
  | 'distanceMin'
  | 'distanceMax'
>

export function usePlanetFilters() {
  const [filters, setFilters] = useState<PlanetFilters>(DEFAULT_PLANET_FILTERS)
  const debouncedQuery = useDebouncedValue(filters.q, 300)

  const { discoveryMethod, habitableCandidate } = filters
  const numericFilters = useMemo<NumericFilters>(
    () => ({
      discoveryYearMin: filters.discoveryYearMin,
      discoveryYearMax: filters.discoveryYearMax,
      radiusMin: filters.radiusMin,
      radiusMax: filters.radiusMax,
      massMin: filters.massMin,
      massMax: filters.massMax,
      orbitalPeriodMin: filters.orbitalPeriodMin,
      orbitalPeriodMax: filters.orbitalPeriodMax,
      distanceMin: filters.distanceMin,
      distanceMax: filters.distanceMax,
    }),
    [
      filters.discoveryYearMin,
      filters.discoveryYearMax,
      filters.radiusMin,
      filters.radiusMax,
      filters.massMin,
      filters.massMax,
      filters.orbitalPeriodMin,
      filters.orbitalPeriodMax,
      filters.distanceMin,
      filters.distanceMax,
    ],
  )
  // Range inputs are typed digit by digit, so like the search box they are
  // applied 300ms after the last change to any of them.
  const {
    discoveryYearMin,
    discoveryYearMax,
    radiusMin,
    radiusMax,
    massMin,
    massMax,
    orbitalPeriodMin,
    orbitalPeriodMax,
    distanceMin,
    distanceMax,
  } = useDebouncedValue(numericFilters, 300)

  // Depend on individual applied values (not objects) so the params keep
  // their reference unless something that is actually sent changes.
  const debouncedFilters = useMemo<PlanetFilters>(
    () => ({
      q: debouncedQuery,
      discoveryMethod,
      discoveryYearMin,
      discoveryYearMax,
      radiusMin,
      radiusMax,
      massMin,
      massMax,
      orbitalPeriodMin,
      orbitalPeriodMax,
      distanceMin,
      distanceMax,
      habitableCandidate,
    }),
    [
      debouncedQuery,
      discoveryMethod,
      discoveryYearMin,
      discoveryYearMax,
      radiusMin,
      radiusMax,
      massMin,
      massMax,
      orbitalPeriodMin,
      orbitalPeriodMax,
      distanceMin,
      distanceMax,
      habitableCandidate,
    ],
  )

  const listQueryParams = useMemo(
    () => toPlanetListQueryParams(debouncedFilters),
    [debouncedFilters],
  )

  // Charts only receive method, year and distance filters.
  const chartQueryParams = useMemo(
    () =>
      toChartFilterQueryParams({
        ...DEFAULT_PLANET_FILTERS,
        discoveryMethod,
        discoveryYearMin,
        discoveryYearMax,
        distanceMin,
        distanceMax,
      }),
    [discoveryMethod, discoveryYearMin, discoveryYearMax, distanceMin, distanceMax],
  )

  const setFilter = useCallback(
    <K extends keyof PlanetFilters>(key: K, value: PlanetFilters[K]) => {
      setFilters((current) => ({
        ...current,
        [key]: value,
      }))
    },
    [],
  )

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_PLANET_FILTERS)
  }, [])

  const isDebouncingSearch = filters.q !== debouncedQuery

  return {
    filters,
    debouncedFilters,
    setFilter,
    resetFilters,
    listQueryParams,
    chartQueryParams,
    isDebouncingSearch,
  }
}
