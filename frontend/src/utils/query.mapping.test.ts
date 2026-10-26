import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLANET_FILTERS,
  hasActiveFilters,
  toChartFilterQueryParams,
  toPlanetListQueryParams,
} from './query'
import type { PlanetFilters } from '../types/filters'

const ALL_SET: PlanetFilters = {
  q: '  kepler  ',
  discoveryMethod: 'Transit',
  discoveryYearMin: 2000,
  discoveryYearMax: 2010,
  radiusMin: 0.5,
  radiusMax: 2,
  massMin: 1,
  massMax: 10,
  orbitalPeriodMin: 3,
  orbitalPeriodMax: 300,
  distanceMin: 5,
  distanceMax: 500,
  habitableCandidate: true,
}

describe('toPlanetListQueryParams mapping (test coverage AC 1-2)', () => {
  it('maps every filter to its API key, trimming q (AC 1)', () => {
    expect(toPlanetListQueryParams(ALL_SET)).toEqual({
      q: 'kepler',
      discovery_method: 'Transit',
      disc_year_min: 2000,
      disc_year_max: 2010,
      radius_min: 0.5,
      radius_max: 2,
      mass_min: 1,
      mass_max: 10,
      orbital_period_min: 3,
      orbital_period_max: 300,
      distance_min: 5,
      distance_max: 500,
      habitable_candidate: true,
    })
  })

  it('returns an empty object for the default filters (AC 2)', () => {
    expect(toPlanetListQueryParams(DEFAULT_PLANET_FILTERS)).toEqual({})
  })

  it.each(['', '   ', '\t\n'])('omits q when it is empty or whitespace only (%j) (AC 2)', (q) => {
    expect('q' in toPlanetListQueryParams({ ...DEFAULT_PLANET_FILTERS, q })).toBe(false)
  })

  it('omits habitable_candidate when false (AC 2)', () => {
    const params = toPlanetListQueryParams({ ...DEFAULT_PLANET_FILTERS, habitableCandidate: false })

    expect('habitable_candidate' in params).toBe(false)
  })

  it('keeps 0 for every numeric filter (AC 2)', () => {
    const params = toPlanetListQueryParams({
      ...DEFAULT_PLANET_FILTERS,
      discoveryYearMin: 0,
      discoveryYearMax: 0,
      radiusMin: 0,
      radiusMax: 0,
      massMin: 0,
      massMax: 0,
      orbitalPeriodMin: 0,
      orbitalPeriodMax: 0,
      distanceMin: 0,
      distanceMax: 0,
    })

    expect(params).toEqual({
      disc_year_min: 0,
      disc_year_max: 0,
      radius_min: 0,
      radius_max: 0,
      mass_min: 0,
      mass_max: 0,
      orbital_period_min: 0,
      orbital_period_max: 0,
      distance_min: 0,
      distance_max: 0,
    })
  })

  it.each([
    ['radiusMin', 'radius_min'],
    ['radiusMax', 'radius_max'],
    ['massMin', 'mass_min'],
    ['massMax', 'mass_max'],
    ['orbitalPeriodMin', 'orbital_period_min'],
    ['orbitalPeriodMax', 'orbital_period_max'],
    ['discoveryYearMin', 'disc_year_min'],
    ['discoveryYearMax', 'disc_year_max'],
  ] as const)('sets only %s → %s when only it is given (AC 1-2)', (key, apiKey) => {
    expect(toPlanetListQueryParams({ ...DEFAULT_PLANET_FILTERS, [key]: 7 })).toEqual({
      [apiKey]: 7,
    })
  })
})

describe('toChartFilterQueryParams mapping (test coverage AC 3)', () => {
  it('keeps only method, year and distance from fully set filters', () => {
    expect(toChartFilterQueryParams(ALL_SET)).toEqual({
      discovery_method: 'Transit',
      disc_year_min: 2000,
      disc_year_max: 2010,
      distance_min: 5,
      distance_max: 500,
    })
  })

  it('maps the discovery method alone', () => {
    expect(
      toChartFilterQueryParams({ ...DEFAULT_PLANET_FILTERS, discoveryMethod: 'Imaging' }),
    ).toEqual({ discovery_method: 'Imaging' })
  })

  it('maps a single year bound, keeping 0', () => {
    expect(
      toChartFilterQueryParams({ ...DEFAULT_PLANET_FILTERS, discoveryYearMax: 0 }),
    ).toEqual({ disc_year_max: 0 })
  })
})

describe('hasActiveFilters for every key (test coverage AC 4)', () => {
  it('is false for the defaults', () => {
    expect(hasActiveFilters(DEFAULT_PLANET_FILTERS)).toBe(false)
  })

  it.each<[string, Partial<PlanetFilters>]>([
    ['q', { q: 'k' }],
    ['discoveryMethod', { discoveryMethod: 'Transit' }],
    ['discoveryYearMin', { discoveryYearMin: 0 }],
    ['discoveryYearMax', { discoveryYearMax: 2000 }],
    ['radiusMin', { radiusMin: 0 }],
    ['radiusMax', { radiusMax: 1 }],
    ['massMin', { massMin: 0 }],
    ['massMax', { massMax: 1 }],
    ['orbitalPeriodMin', { orbitalPeriodMin: 0 }],
    ['orbitalPeriodMax', { orbitalPeriodMax: 1 }],
    ['distanceMin', { distanceMin: 0 }],
    ['distanceMax', { distanceMax: 1 }],
    ['habitableCandidate', { habitableCandidate: true }],
  ])('is true when only %s is set', (_key, override) => {
    expect(hasActiveFilters({ ...DEFAULT_PLANET_FILTERS, ...override })).toBe(true)
  })

  it('is false for a whitespace-only q', () => {
    expect(hasActiveFilters({ ...DEFAULT_PLANET_FILTERS, q: '   ' })).toBe(false)
  })
})
