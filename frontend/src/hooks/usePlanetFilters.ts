import { useCallback, useMemo, useState } from 'react'
import type { PlanetFilters } from '../types/filters'
import {
  DEFAULT_PLANET_FILTERS,
  toChartFilterQueryParams,
  toPlanetListQueryParams,
} from '../utils/query'
import { useDebouncedValue } from './useDebouncedValue'

export function usePlanetFilters() {
  const [filters, setFilters] = useState<PlanetFilters>(DEFAULT_PLANET_FILTERS)
  const debouncedQuery = useDebouncedValue(filters.q, 300)

  const debouncedFilters = useMemo(
    () => ({
      ...filters,
      q: debouncedQuery,
    }),
    [filters, debouncedQuery],
  )

  const listQueryParams = useMemo(
    () => toPlanetListQueryParams(debouncedFilters),
    [debouncedFilters],
  )

  const chartQueryParams = useMemo(
    () => toChartFilterQueryParams(debouncedFilters),
    [debouncedFilters],
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
