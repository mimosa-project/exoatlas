import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePlanetFilters } from './usePlanetFilters'
import { DEFAULT_PLANET_FILTERS } from '../utils/query'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePlanetFilters (test coverage AC 6-10)', () => {
  it('starts from the default filters (AC 6)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    expect(result.current.filters).toEqual(DEFAULT_PLANET_FILTERS)
    expect(result.current.listQueryParams).toEqual({})
    expect(result.current.chartQueryParams).toEqual({})
    expect(result.current.isDebouncingSearch).toBe(false)
  })

  it('updates only the given key with setFilter and restores defaults with resetFilters (AC 7)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('radiusMin', 1.5)
    })
    expect(result.current.filters).toEqual({ ...DEFAULT_PLANET_FILTERS, radiusMin: 1.5 })

    act(() => {
      result.current.setFilter('discoveryMethod', 'Transit')
    })
    expect(result.current.filters).toEqual({
      ...DEFAULT_PLANET_FILTERS,
      radiusMin: 1.5,
      discoveryMethod: 'Transit',
    })

    act(() => {
      result.current.resetFilters()
    })
    expect(result.current.filters).toEqual(DEFAULT_PLANET_FILTERS)
  })

  it('debounces q into listQueryParams by 300ms while flagging isDebouncingSearch (AC 8)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('q', ' kepler ')
    })
    expect(result.current.filters.q).toBe(' kepler ')
    expect(result.current.isDebouncingSearch).toBe(true)
    expect('q' in result.current.listQueryParams).toBe(false)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current.isDebouncingSearch).toBe(true)
    expect('q' in result.current.listQueryParams).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.isDebouncingSearch).toBe(false)
    expect(result.current.listQueryParams.q).toBe('kepler')
  })

  it('applies non-search filters to both param sets immediately (AC 8)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('discoveryYearMin', 2001)
    })

    expect(result.current.listQueryParams).toEqual({ disc_year_min: 2001 })
    expect(result.current.chartQueryParams).toEqual({ disc_year_min: 2001 })
    expect(result.current.isDebouncingSearch).toBe(false)
  })

  it('never puts q into chartQueryParams (AC 9)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('q', 'kepler')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.listQueryParams.q).toBe('kepler')
    expect('q' in result.current.chartQueryParams).toBe(false)
  })

  it('keeps param and callback references across re-renders without filter changes (AC 10)', () => {
    const { result, rerender } = renderHook(() => usePlanetFilters())
    act(() => {
      result.current.setFilter('massMax', 10)
    })
    const before = result.current

    rerender()

    expect(result.current.listQueryParams).toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
    expect(result.current.setFilter).toBe(before.setFilter)
    expect(result.current.resetFilters).toBe(before.resetFilters)
  })

  // Superseded by chart-refetch-fixes AC 1-2: only filters that are actually
  // sent change each param object's reference.
  it('creates a new listQueryParams but keeps chartQueryParams for a list-only filter (chart-refetch AC 1-2)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter('massMax', 10)
    })

    expect(result.current.listQueryParams).not.toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
  })
})

describe('usePlanetFilters param references (chart-refetch AC 1-4)', () => {
  it.each([
    ['discoveryMethod', 'Transit'],
    ['discoveryYearMin', 2000],
    ['discoveryYearMax', 2010],
    ['distanceMin', 1],
    ['distanceMax', 100],
  ] as const)('creates new chart and list params when %s changes (AC 1-2)', (key, value) => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter(key, value)
    })

    expect(result.current.chartQueryParams).not.toBe(before.chartQueryParams)
    expect(result.current.listQueryParams).not.toBe(before.listQueryParams)
  })

  it.each([
    ['radiusMin', 1],
    ['radiusMax', 2],
    ['massMin', 3],
    ['massMax', 6],
    ['orbitalPeriodMin', 4],
    ['orbitalPeriodMax', 5],
    ['habitableCandidate', true],
  ] as const)('keeps chartQueryParams when %s changes (AC 1)', (key, value) => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter(key, value)
    })

    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
    expect(result.current.listQueryParams).not.toBe(before.listQueryParams)
  })

  it('keeps both param references while typing a search, and only list params change after the debounce (AC 1-2)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter('q', 'k')
    })
    act(() => {
      result.current.setFilter('q', 'ke')
    })
    expect(result.current.isDebouncingSearch).toBe(true)
    expect(result.current.listQueryParams).toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.listQueryParams).not.toBe(before.listQueryParams)
    expect(result.current.listQueryParams.q).toBe('ke')
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
  })

  it('keeps the param contents unchanged (AC 3)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('discoveryMethod', 'Imaging')
      result.current.setFilter('radiusMax', 2)
      result.current.setFilter('distanceMin', 0)
    })

    expect(result.current.listQueryParams).toEqual({
      discovery_method: 'Imaging',
      radius_max: 2,
      distance_min: 0,
    })
    expect(result.current.chartQueryParams).toEqual({
      discovery_method: 'Imaging',
      distance_min: 0,
    })
  })

  it('keeps both references when a filter is set to its current value (AC 4)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    act(() => {
      result.current.setFilter('discoveryYearMin', 2001)
      result.current.setFilter('radiusMin', 1)
    })
    const before = result.current

    act(() => {
      result.current.setFilter('discoveryYearMin', 2001)
      result.current.setFilter('radiusMin', 1)
      result.current.setFilter('q', '')
    })

    expect(result.current.listQueryParams).toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
  })
})

describe('usePlanetFilters resetFilters at defaults (chart-refetch AC 4)', () => {
  it('keeps both references when resetting filters that are already default', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.listQueryParams).toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
  })
})
