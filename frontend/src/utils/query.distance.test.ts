import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLANET_FILTERS,
  hasActiveFilters,
  toChartFilterQueryParams,
  toPlanetListQueryParams,
} from './query'

describe('distance filter in utils/query (sky map spec AC 1-4)', () => {
  it('defaults distanceMin and distanceMax to null (AC 1)', () => {
    expect(DEFAULT_PLANET_FILTERS.distanceMin).toBeNull()
    expect(DEFAULT_PLANET_FILTERS.distanceMax).toBeNull()
  })

  it('adds distance_min / distance_max to list params when set (AC 2)', () => {
    const params = toPlanetListQueryParams({
      ...DEFAULT_PLANET_FILTERS,
      distanceMin: 10,
      distanceMax: 250.5,
    })

    expect(params.distance_min).toBe(10)
    expect(params.distance_max).toBe(250.5)
  })

  it('omits distance params from list params when null (AC 2)', () => {
    const params = toPlanetListQueryParams(DEFAULT_PLANET_FILTERS)

    expect('distance_min' in params).toBe(false)
    expect('distance_max' in params).toBe(false)
  })

  it('treats 0 as a value in list params (AC 2)', () => {
    const params = toPlanetListQueryParams({
      ...DEFAULT_PLANET_FILTERS,
      distanceMin: 0,
      distanceMax: 0,
    })

    expect(params.distance_min).toBe(0)
    expect(params.distance_max).toBe(0)
  })

  it('sets only the bound that is given (AC 2, 3)', () => {
    const filters = { ...DEFAULT_PLANET_FILTERS, distanceMax: 100 }

    const list = toPlanetListQueryParams(filters)
    const chart = toChartFilterQueryParams(filters)

    expect('distance_min' in list).toBe(false)
    expect(list.distance_max).toBe(100)
    expect('distance_min' in chart).toBe(false)
    expect(chart.distance_max).toBe(100)
  })

  it('keeps the other list params unchanged alongside distance (AC 2)', () => {
    const params = toPlanetListQueryParams({
      ...DEFAULT_PLANET_FILTERS,
      q: ' kepler ',
      discoveryMethod: 'Transit',
      radiusMin: 1,
      habitableCandidate: true,
      distanceMin: 5,
    })

    expect(params).toEqual({
      q: 'kepler',
      discovery_method: 'Transit',
      radius_min: 1,
      habitable_candidate: true,
      distance_min: 5,
    })
  })

  it('adds distance params to chart params, still excluding list-only filters (AC 3)', () => {
    const params = toChartFilterQueryParams({
      ...DEFAULT_PLANET_FILTERS,
      q: 'kepler',
      discoveryMethod: 'Imaging',
      discoveryYearMin: 2000,
      discoveryYearMax: 2010,
      radiusMin: 1,
      radiusMax: 2,
      massMin: 3,
      massMax: 4,
      orbitalPeriodMin: 5,
      orbitalPeriodMax: 6,
      habitableCandidate: true,
      distanceMin: 0,
      distanceMax: 500,
    })

    expect(params).toEqual({
      discovery_method: 'Imaging',
      disc_year_min: 2000,
      disc_year_max: 2010,
      distance_min: 0,
      distance_max: 500,
    })
  })

  it('omits distance params from chart params when null (AC 3)', () => {
    expect(toChartFilterQueryParams(DEFAULT_PLANET_FILTERS)).toEqual({})
  })

  it('reports active filters when only a distance bound is set (AC 4)', () => {
    expect(hasActiveFilters(DEFAULT_PLANET_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_PLANET_FILTERS, distanceMin: 0 })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_PLANET_FILTERS, distanceMax: 100 })).toBe(true)
  })
})
