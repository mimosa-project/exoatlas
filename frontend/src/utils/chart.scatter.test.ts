import { describe, expect, it } from 'vitest'
import {
  buildOrbitScatterLayout,
  buildOrbitScatterTraces,
  getDiscoveryMethodColor,
  type OrbitScatterTrace,
} from './chart'
import type { ScatterOrbitRadiusItem } from '../types/api'

function buildItem(
  overrides: Partial<ScatterOrbitRadiusItem> = {},
): ScatterOrbitRadiusItem {
  return {
    id: 1,
    planet_name: '11 Com b',
    host_name: '11 Com',
    discovery_method: 'Radial Velocity',
    discovery_year: 2007,
    orbital_period_days: 326.03,
    radius_earth: 12.1,
    mass_earth: 6165.6,
    ...overrides,
  }
}

type LooseTrace = OrbitScatterTrace & {
  type: string
  mode: string
  name: string
  x: number[]
  y: number[]
  customdata: string[][]
  hovertemplate: string
  marker: { color: string }
}

function traces(
  items: ScatterOrbitRadiusItem[],
  yAxis: 'radius' | 'mass' = 'radius',
): LooseTrace[] {
  return buildOrbitScatterTraces(items, yAxis) as LooseTrace[]
}

describe('buildOrbitScatterTraces (AC 2-4)', () => {
  it('returns an empty array for empty input', () => {
    expect(buildOrbitScatterTraces([], 'radius')).toEqual([])
    expect(buildOrbitScatterTraces([], 'mass')).toEqual([])
  })

  it('builds one marker scatter trace per method with x = period and y = radius', () => {
    const result = traces([
      buildItem({ planet_name: 'A b', discovery_method: 'Transit', orbital_period_days: 3, radius_earth: 1.5 }),
      buildItem({ planet_name: 'B b', discovery_method: 'Radial Velocity', orbital_period_days: 300, radius_earth: 11 }),
      buildItem({ planet_name: 'C b', discovery_method: 'Transit', orbital_period_days: 10, radius_earth: 2.5 }),
    ])

    expect(result).toHaveLength(2)
    const [transit, rv] = result
    expect(transit.type).toBe('scatter')
    expect(transit.mode).toBe('markers')
    expect(transit.name).toBe('Transit')
    expect(transit.x).toEqual([3, 10])
    expect(transit.y).toEqual([1.5, 2.5])
    expect(transit.marker.color).toBe(getDiscoveryMethodColor('Transit'))

    expect(rv.type).toBe('scatter')
    expect(rv.mode).toBe('markers')
    expect(rv.name).toBe('Radial Velocity')
    expect(rv.x).toEqual([300])
    expect(rv.y).toEqual([11])
    expect(rv.marker.color).toBe(getDiscoveryMethodColor('Radial Velocity'))
  })

  it('uses mass_earth for y when yAxis is mass', () => {
    const [trace] = traces(
      [buildItem({ orbital_period_days: 5, radius_earth: 1, mass_earth: 300 })],
      'mass',
    )

    expect(trace.x).toEqual([5])
    expect(trace.y).toEqual([300])
  })

  it('keeps the input order of points within a trace', () => {
    const [trace] = traces([
      buildItem({ planet_name: 'Z b', orbital_period_days: 50, radius_earth: 3 }),
      buildItem({ planet_name: 'A b', orbital_period_days: 1, radius_earth: 9 }),
      buildItem({ planet_name: 'M b', orbital_period_days: 20, radius_earth: 5 }),
    ])

    expect(trace.x).toEqual([50, 1, 20])
    expect(trace.customdata.map((point) => point[0])).toEqual(['Z b', 'A b', 'M b'])
  })

  it('excludes points with a null period or a null selected y value, dropping emptied methods', () => {
    const items = [
      buildItem({ planet_name: 'Keep b', discovery_method: 'Transit', orbital_period_days: 4, radius_earth: 1, mass_earth: null }),
      buildItem({ planet_name: 'NoPeriod b', discovery_method: 'Transit', orbital_period_days: null }),
      buildItem({ planet_name: 'NoRadius b', discovery_method: 'Imaging', radius_earth: null, mass_earth: 900 }),
    ]

    const byRadius = traces(items, 'radius')
    expect(byRadius.map((trace) => trace.name)).toEqual(['Transit'])
    expect(byRadius[0].customdata.map((point) => point[0])).toEqual(['Keep b'])

    const byMass = traces(items, 'mass')
    expect(byMass.map((trace) => trace.name)).toEqual(['Imaging'])
    expect(byMass[0].y).toEqual([900])
  })

  it('treats 0 as a value, not missing', () => {
    const [trace] = traces([buildItem({ orbital_period_days: 0, radius_earth: 0 })])

    expect(trace.x).toEqual([0])
    expect(trace.y).toEqual([0])
  })

  it('returns an empty array when every point is excluded', () => {
    expect(
      buildOrbitScatterTraces(
        [buildItem({ orbital_period_days: null }), buildItem({ radius_earth: null })],
        'radius',
      ),
    ).toEqual([])
  })

  it('orders traces by point count (after exclusion) descending, ties by name ascending', () => {
    const result = traces([
      buildItem({ discovery_method: 'Imaging' }),
      buildItem({ discovery_method: 'Transit' }),
      buildItem({ discovery_method: 'Transit' }),
      buildItem({ discovery_method: 'Transit' }),
      buildItem({ discovery_method: 'Astrometry' }),
      buildItem({ discovery_method: 'Microlensing' }),
      buildItem({ discovery_method: 'Microlensing', radius_earth: null }),
      buildItem({ discovery_method: 'Microlensing', radius_earth: null }),
    ])

    expect(result.map((trace) => trace.name)).toEqual([
      'Transit',
      'Astrometry',
      'Imaging',
      'Microlensing',
    ])
  })

  it('groups null discovery_method into one "Not available" trace with the fallback color', () => {
    const result = traces([
      buildItem({ planet_name: 'A b', discovery_method: null }),
      buildItem({ planet_name: 'B b', discovery_method: null }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Not available')
    expect(result[0].marker.color).toBe(getDiscoveryMethodColor(null))
    expect(result[0].x).toHaveLength(2)
  })

  it('sets per-point customdata with formatted display strings in the documented order (AC 3)', () => {
    const [trace] = traces([
      buildItem({
        planet_name: '11 Com b',
        host_name: '11 Com',
        discovery_year: 2007,
        radius_earth: 12.1,
        mass_earth: 6165.6,
        orbital_period_days: 326.03,
      }),
    ])

    expect(trace.customdata).toEqual([
      ['11 Com b', '11 Com', '2007', '12.10 R_Earth', '6,165.60 M_Earth', '326.03 d'],
    ])
  })

  it('uses "Not available" in customdata for null fields, including the non-selected axis', () => {
    const [trace] = traces(
      [
        buildItem({
          planet_name: null,
          host_name: null,
          discovery_year: null,
          radius_earth: null,
          mass_earth: 2,
          orbital_period_days: 1,
        }),
      ],
      'mass',
    )

    expect(trace.customdata).toEqual([
      ['Not available', 'Not available', 'Not available', 'Not available', '2.00 M_Earth', '1.00 d'],
    ])
  })

  it('formats discovery year without a thousands separator', () => {
    const [trace] = traces([buildItem({ discovery_year: 12345 })])

    expect(trace.customdata[0][2]).toBe('12345')
  })

  it('keeps customdata aligned with x', () => {
    const result = traces([
      buildItem({ discovery_method: 'Transit' }),
      buildItem({ discovery_method: 'Imaging' }),
      buildItem({ discovery_method: 'Transit' }),
    ])

    for (const trace of result) {
      expect(trace.customdata).toHaveLength(trace.x.length)
    }
  })

  it('builds a hovertemplate with all six customdata fields, the method name and <extra></extra> (AC 4)', () => {
    const result = traces([
      buildItem({ discovery_method: 'Transit' }),
      buildItem({ discovery_method: null }),
    ])

    for (const trace of result) {
      for (let index = 0; index <= 5; index += 1) {
        expect(trace.hovertemplate).toContain(`%{customdata[${index}]}`)
      }
      expect(trace.hovertemplate).toContain(trace.name)
      expect(trace.hovertemplate.endsWith('<extra></extra>')).toBe(true)
    }
  })

  it('does not embed planet or host names directly into the hovertemplate', () => {
    const [trace] = traces([
      buildItem({ planet_name: 'Unique Planet Name', host_name: 'Unique Host Name' }),
    ])

    expect(trace.hovertemplate).not.toContain('Unique Planet Name')
    expect(trace.hovertemplate).not.toContain('Unique Host Name')
  })
})

describe('buildOrbitScatterLayout (AC 5)', () => {
  it.each([
    ['radius', true, 'Radius (Earth radii)', 'log'],
    ['radius', false, 'Radius (Earth radii)', 'linear'],
    ['mass', true, 'Mass (Earth masses)', 'log'],
    ['mass', false, 'Mass (Earth masses)', 'linear'],
  ] as const)('yAxis=%s logScale=%s', (yAxis, logScale, yTitle, axisType) => {
    expect(buildOrbitScatterLayout(yAxis, logScale)).toMatchObject({
      showlegend: true,
      hovermode: 'closest',
      xaxis: { title: { text: 'Orbital period (days)' }, type: axisType },
      yaxis: { title: { text: yTitle }, type: axisType },
    })
  })
})
