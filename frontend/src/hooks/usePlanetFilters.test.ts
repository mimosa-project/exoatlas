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

  it('creates new param objects when a filter changes (AC 10)', () => {
    const { result } = renderHook(() => usePlanetFilters())
    const before = result.current

    act(() => {
      result.current.setFilter('massMax', 10)
    })

    expect(result.current.listQueryParams).not.toBe(before.listQueryParams)
    expect(result.current.chartQueryParams).not.toBe(before.chartQueryParams)
  })
})
