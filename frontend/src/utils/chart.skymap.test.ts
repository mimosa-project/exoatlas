import { describe, expect, it } from 'vitest'
import {
  buildSkyMapLayout,
  buildSkyMapTraces,
  getDiscoveryMethodColor,
  type SkyMapTrace,
} from './chart'
import type { SkyMapItem } from '../types/api'

function buildItem(overrides: Partial<SkyMapItem> = {}): SkyMapItem {
  return {
    id: 1,
    planet_name: '11 Com b',
    host_name: '11 Com',
    discovery_method: 'Radial Velocity',
    discovery_year: 2007,
    right_ascension: 185.1787793,
    declination: 17.7932516,
    distance_parsec: 93.1846,
    ...overrides,
  }
}

type LooseTrace = SkyMapTrace & {
  type: string
  mode: string
  name: string
  x: number[]
  y: number[]
  customdata: string[][]
  hovertemplate: string
  marker: { color: string; opacity: number }
}

function traces(items: SkyMapItem[]): LooseTrace[] {
  return buildSkyMapTraces(items) as LooseTrace[]
}

describe('buildSkyMapTraces (sky map spec AC 9-12)', () => {
  it('returns an empty array for empty input', () => {
    expect(buildSkyMapTraces([])).toEqual([])
  })

  it('builds one marker scatter trace per method with x = RA and y = Dec', () => {
    const result = traces([
      buildItem({ discovery_method: 'Transit', right_ascension: 10, declination: -20 }),
      buildItem({ discovery_method: 'Radial Velocity', right_ascension: 200, declination: 45 }),
      buildItem({ discovery_method: 'Transit', right_ascension: 30, declination: 5 }),
    ])

    expect(result).toHaveLength(2)
    const [transit, rv] = result
    expect(transit.type).toBe('scatter')
    expect(transit.mode).toBe('markers')
    expect(transit.name).toBe('Transit')
    expect(transit.x).toEqual([10, 30])
    expect(transit.y).toEqual([-20, 5])
    expect(transit.marker.color).toBe(getDiscoveryMethodColor('Transit'))
    expect(rv.name).toBe('Radial Velocity')
    expect(rv.x).toEqual([200])
    expect(rv.y).toEqual([45])
    expect(rv.marker.color).toBe(getDiscoveryMethodColor('Radial Velocity'))
  })

  it('keeps the input order of points within a trace', () => {
    const [trace] = traces([
      buildItem({ planet_name: 'Z b', right_ascension: 300 }),
      buildItem({ planet_name: 'A b', right_ascension: 1 }),
      buildItem({ planet_name: 'M b', right_ascension: 150 }),
    ])

    expect(trace.x).toEqual([300, 1, 150])
    expect(trace.customdata.map((point) => point[0])).toEqual(['Z b', 'A b', 'M b'])
  })

  it('excludes points with null RA or Dec but keeps points with a null distance', () => {
    const result = traces([
      buildItem({ planet_name: 'Keep b', discovery_method: 'Transit', distance_parsec: null }),
      buildItem({ planet_name: 'NoRa b', discovery_method: 'Transit', right_ascension: null }),
      buildItem({ planet_name: 'NoDec b', discovery_method: 'Imaging', declination: null }),
    ])

    expect(result.map((trace) => trace.name)).toEqual(['Transit'])
    expect(result[0].customdata.map((point) => point[0])).toEqual(['Keep b'])
  })

  it('treats 0 as a value, not missing', () => {
    const [trace] = traces([buildItem({ right_ascension: 0, declination: 0 })])

    expect(trace.x).toEqual([0])
    expect(trace.y).toEqual([0])
  })

  it('returns an empty array when every point is excluded', () => {
    expect(
      buildSkyMapTraces([
        buildItem({ right_ascension: null }),
        buildItem({ declination: null }),
      ]),
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
      buildItem({ discovery_method: 'Microlensing', declination: null }),
      buildItem({ discovery_method: 'Microlensing', declination: null }),
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
      buildItem({ discovery_method: null }),
      buildItem({ discovery_method: null }),
    ])

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Not available')
    expect(result[0].marker.color).toBe(getDiscoveryMethodColor(null))
    expect(result[0].x).toHaveLength(2)
  })

  it('sets marker opacity to 0.6 on every trace (AC 12)', () => {
    const result = traces([
      buildItem({ discovery_method: 'Transit' }),
      buildItem({ discovery_method: null }),
    ])

    for (const trace of result) {
      expect(trace.marker.opacity).toBe(0.6)
    }
  })

  it('sets per-point customdata with formatted display strings in the documented order (AC 10)', () => {
    const [trace] = traces([
      buildItem({
        planet_name: '11 Com b',
        host_name: '11 Com',
        discovery_year: 2007,
        right_ascension: 185.1787793,
        declination: -5.5,
        distance_parsec: 93.1846,
      }),
    ])

    expect(trace.customdata).toEqual([
      ['11 Com b', '11 Com', '2007', '185.1788°', '-5.5000°', '93.18 pc'],
    ])
  })

  it('uses "Not available" in customdata for null fields', () => {
    const [trace] = traces([
      buildItem({
        planet_name: null,
        host_name: null,
        discovery_year: null,
        distance_parsec: null,
        right_ascension: 0,
        declination: 0,
      }),
    ])

    expect(trace.customdata).toEqual([
      ['Not available', 'Not available', 'Not available', '0.0000°', '0.0000°', 'Not available'],
    ])
  })

  it('formats discovery year without a thousands separator', () => {
    const [trace] = traces([buildItem({ discovery_year: 12345 })])

    expect(trace.customdata[0][2]).toBe('12345')
  })

  it('builds a hovertemplate with all six customdata fields, the method name and <extra></extra> (AC 11)', () => {
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

  it('does not embed planet or host names directly into the hovertemplate (AC 11)', () => {
    const [trace] = traces([
      buildItem({ planet_name: 'Unique Planet Name', host_name: 'Unique Host Name' }),
    ])

    expect(trace.hovertemplate).not.toContain('Unique Planet Name')
    expect(trace.hovertemplate).not.toContain('Unique Host Name')
  })
})

describe('buildSkyMapLayout (sky map spec AC 13)', () => {
  it('returns legend, closest hover and fixed RA (reversed) / Dec axes', () => {
    expect(buildSkyMapLayout()).toMatchObject({
      showlegend: true,
      hovermode: 'closest',
      xaxis: { title: { text: 'Right ascension (°)' }, range: [360, 0] },
      yaxis: { title: { text: 'Declination (°)' }, range: [-90, 90] },
    })
  })

  it('returns equal content on every call', () => {
    expect(buildSkyMapLayout()).toEqual(buildSkyMapLayout())
  })
})
