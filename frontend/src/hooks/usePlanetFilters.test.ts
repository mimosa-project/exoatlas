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

  it('applies non-search filters to both param sets once debounced (AC 8, review2-fixes AC 6)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('discoveryYearMin', 2001)
    })
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
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
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
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
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
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
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
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
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
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
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
    })
    const before = result.current

    act(() => {
      result.current.setFilter('discoveryYearMin', 2001)
      result.current.setFilter('radiusMin', 1)
      result.current.setFilter('q', '')
    })
    // review2-fixes AC 6: numeric filters are applied after a 300ms debounce.
    act(() => {
      vi.advanceTimersByTime(300)
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

describe('usePlanetFilters numeric filter debounce (review2-fixes AC 4-10)', () => {
  const NUMERIC_KEYS = [
    'discoveryYearMin',
    'discoveryYearMax',
    'radiusMin',
    'radiusMax',
    'massMin',
    'massMax',
    'orbitalPeriodMin',
    'orbitalPeriodMax',
    'distanceMin',
    'distanceMax',
  ] as const

  it.each(NUMERIC_KEYS)('updates filters.%s immediately but params only after 300ms (AC 5-6)', (key) => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter(key, 7)
    })
    expect(result.current.filters[key]).toBe(7)
    expect(result.current.listQueryParams).toBe(before.listQueryParams)

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current.listQueryParams).toBe(before.listQueryParams)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.listQueryParams).not.toBe(before.listQueryParams)
    expect(Object.values(result.current.listQueryParams)).toContain(7)
  })

  it('applies only the last value of rapid typing (AC 6)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const seen: unknown[] = []

    for (const value of [1, 15, 150, 1500]) {
      act(() => {
        result.current.setFilter('distanceMax', value)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      seen.push(result.current.chartQueryParams.distance_max)
    }
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(seen).toEqual([undefined, undefined, undefined, undefined])
    expect(result.current.chartQueryParams).toEqual({ distance_max: 1500 })
    expect(result.current.listQueryParams).toEqual({ distance_max: 1500 })
  })

  it('applies several numeric changes together 300ms after the last one (AC 6)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('radiusMin', 1)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.setFilter('distanceMin', 10)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.listQueryParams).toEqual({})

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.listQueryParams).toEqual({ radius_min: 1, distance_min: 10 })
  })

  it('applies discoveryMethod and habitableCandidate immediately without pending numeric values (AC 7)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('distanceMax', 50)
      result.current.setFilter('discoveryMethod', 'Imaging')
      result.current.setFilter('habitableCandidate', true)
    })

    expect(result.current.listQueryParams).toEqual({
      discovery_method: 'Imaging',
      habitable_candidate: true,
    })
    expect(result.current.chartQueryParams).toEqual({ discovery_method: 'Imaging' })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.chartQueryParams).toEqual({
      discovery_method: 'Imaging',
      distance_max: 50,
    })
  })

  it('does not flag isDebouncingSearch for numeric changes (AC 8)', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('massMin', 2)
    })

    expect(result.current.isDebouncingSearch).toBe(false)
  })

  it('applies resetFilters for numeric filters after 300ms (AC 9)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    act(() => {
      result.current.setFilter('discoveryMethod', 'Transit')
      result.current.setFilter('discoveryYearMin', 2015)
      result.current.setFilter('discoveryYearMax', 2015)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.chartQueryParams).toEqual({
      discovery_method: 'Transit',
      disc_year_min: 2015,
      disc_year_max: 2015,
    })

    act(() => {
      result.current.resetFilters()
    })
    expect(result.current.filters).toEqual(DEFAULT_PLANET_FILTERS)
    expect(result.current.chartQueryParams).toEqual({
      disc_year_min: 2015,
      disc_year_max: 2015,
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.chartQueryParams).toEqual({})
  })

  it('keeps references when a pending numeric change returns to the applied value (AC 10)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter('radiusMin', 3)
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => {
      result.current.setFilter('radiusMin', null)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.listQueryParams).toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).toBe(before.chartQueryParams)
  })
})

describe('usePlanetFilters numeric timer is independent of other filters (review2-fixes AC 6)', () => {
  it('does not restart the numeric debounce when q or discoveryMethod changes', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('radiusMin', 2)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.setFilter('discoveryMethod', 'Transit')
      result.current.setFilter('q', 'k')
    })
    expect(result.current.listQueryParams).toEqual({ discovery_method: 'Transit' })

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.listQueryParams).toEqual({
      discovery_method: 'Transit',
      radius_min: 2,
    })
  })
})

describe('usePlanetFilters numeric timer and habitableCandidate (review2-fixes AC 6)', () => {
  it('does not restart the numeric debounce when habitableCandidate changes', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('massMin', 4)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.setFilter('habitableCandidate', true)
    })
    expect(result.current.listQueryParams).toEqual({ habitable_candidate: true })

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.listQueryParams).toEqual({ habitable_candidate: true, mass_min: 4 })
  })

  it('does not restart the numeric debounce when a numeric filter is set to its pending value', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('massMin', 4)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.setFilter('massMin', 4)
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.listQueryParams).toEqual({ mass_min: 4 })
  })
})

describe('usePlanetFilters timelineQueryParams (remaining-fixes AC 1-2)', () => {
  it('excludes the discovery year but keeps method and distance', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('discoveryMethod', 'Imaging')
      result.current.setFilter('discoveryYearMin', 2000)
      result.current.setFilter('discoveryYearMax', 2010)
      result.current.setFilter('distanceMin', 0)
      result.current.setFilter('distanceMax', 100)
      result.current.setFilter('radiusMin', 1)
      result.current.setFilter('q', 'k')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.timelineQueryParams).toEqual({
      discovery_method: 'Imaging',
      distance_min: 0,
      distance_max: 100,
    })
    expect(result.current.chartQueryParams).toEqual({
      discovery_method: 'Imaging',
      disc_year_min: 2000,
      disc_year_max: 2010,
      distance_min: 0,
      distance_max: 100,
    })
  })

  it('keeps its reference when only the year (or list-only filters) change', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter('discoveryYearMin', 2015)
      result.current.setFilter('discoveryYearMax', 2015)
      result.current.setFilter('massMin', 1)
      result.current.setFilter('habitableCandidate', true)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.chartQueryParams).not.toBe(before.chartQueryParams)
    expect(result.current.timelineQueryParams).toBe(before.timelineQueryParams)
  })

  it.each([
    ['discoveryMethod', 'Transit'],
    ['distanceMin', 1],
    ['distanceMax', 2],
  ] as const)('creates a new reference when %s changes', (key, value) => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter(key, value)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.timelineQueryParams).not.toBe(before.timelineQueryParams)
  })

  it('applies distance changes after the numeric debounce', () => {
    const { result } = renderHook(() => usePlanetFilters())

    act(() => {
      result.current.setFilter('distanceMax', 50)
    })
    expect(result.current.timelineQueryParams).toEqual({})

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.timelineQueryParams).toEqual({ distance_max: 50 })
  })
})

describe('usePlanetFilters timelineQueryParams on reset (remaining-fixes §5)', () => {
  it('keeps its reference when resetting filters that only had a year range', () => {
    const { result } = renderHook(() => usePlanetFilters())
    act(() => {
      result.current.setFilter('discoveryYearMin', 2001)
      result.current.setFilter('discoveryYearMax', 2003)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    const before = result.current

    act(() => {
      result.current.resetFilters()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.chartQueryParams).not.toBe(before.chartQueryParams)
    expect(result.current.timelineQueryParams).toBe(before.timelineQueryParams)
  })
})

describe('usePlanetFilters timelineQueryParams stability (remaining-fixes AC 5)', () => {
  it('keeps its reference when filters are set to their current values', () => {
    const { result } = renderHook(() => usePlanetFilters())
    act(() => {
      result.current.setFilter('discoveryMethod', 'Transit')
      result.current.setFilter('distanceMax', 10)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    const before = result.current

    act(() => {
      result.current.setFilter('discoveryMethod', 'Transit')
      result.current.setFilter('distanceMax', 10)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.timelineQueryParams).toBe(before.timelineQueryParams)
  })

  it('keeps its reference when resetting filters that are already default', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.resetFilters()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.timelineQueryParams).toBe(before.timelineQueryParams)
  })
})
