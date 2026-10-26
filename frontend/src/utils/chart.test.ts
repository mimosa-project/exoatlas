import { describe, expect, it } from 'vitest'
import {
  buildTimelineTraces,
  formatDiscoveryMethodLabel,
  getDiscoveryMethodColor,
} from './chart'
import type { DiscoveryTimelineItem } from '../types/api'

const KNOWN_METHODS = [
  'Transit',
  'Radial Velocity',
  'Microlensing',
  'Imaging',
  'Transit Timing Variations',
  'Eclipse Timing Variations',
  'Orbital Brightness Modulation',
  'Pulsar Timing',
  'Astrometry',
  'Pulsation Timing Variations',
  'Disk Kinematics',
]

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

type BarTrace = {
  type: string
  name: string
  x: number[]
  y: number[]
  customdata: number[]
  hovertemplate: string
  marker: { color: string }
}

function traces(items: DiscoveryTimelineItem[]): BarTrace[] {
  return buildTimelineTraces(items) as unknown as BarTrace[]
}

describe('getDiscoveryMethodColor (AC 2-3)', () => {
  it('returns a distinct #rrggbb color for each of the 11 known methods', () => {
    const colors = KNOWN_METHODS.map((method) => getDiscoveryMethodColor(method))

    for (const color of colors) {
      expect(color).toMatch(HEX_COLOR)
    }
    expect(new Set(colors.map((color) => color.toLowerCase())).size).toBe(11)
  })

  it('is deterministic for the same input', () => {
    for (const method of KNOWN_METHODS) {
      expect(getDiscoveryMethodColor(method)).toBe(getDiscoveryMethodColor(method))
    }
  })

  it('returns one shared fallback color for unknown methods and null, distinct from known colors', () => {
    const fallback = getDiscoveryMethodColor(null)
    expect(fallback).toMatch(HEX_COLOR)
    expect(getDiscoveryMethodColor('Something New')).toBe(fallback)
    expect(getDiscoveryMethodColor('')).toBe(fallback)
    expect(getDiscoveryMethodColor('transit')).toBe(fallback)

    const known = KNOWN_METHODS.map((method) =>
      getDiscoveryMethodColor(method).toLowerCase(),
    )
    expect(known).not.toContain(fallback.toLowerCase())
  })
})

describe('formatDiscoveryMethodLabel (AC 4)', () => {
  it('returns the method name as-is, and "Not available" for null', () => {
    expect(formatDiscoveryMethodLabel('Transit')).toBe('Transit')
    expect(formatDiscoveryMethodLabel('Something New')).toBe('Something New')
    expect(formatDiscoveryMethodLabel(null)).toBe('Not available')
  })
})

describe('buildTimelineTraces (AC 5-6)', () => {
  it('returns an empty array for empty input', () => {
    expect(buildTimelineTraces([])).toEqual([])
  })

  it('builds one bar trace per method with years ascending and colors/names from the helpers', () => {
    const result = traces([
      { year: 2010, discovery_method: 'Transit', count: 5 },
      { year: 2005, discovery_method: 'Transit', count: 2 },
      { year: 2008, discovery_method: 'Radial Velocity', count: 1 },
    ])

    expect(result).toHaveLength(2)
    const [transit, rv] = result
    expect(transit.type).toBe('bar')
    expect(transit.name).toBe('Transit')
    expect(transit.x).toEqual([2005, 2010])
    expect(transit.y).toEqual([2, 5])
    expect(transit.marker.color).toBe(getDiscoveryMethodColor('Transit'))

    expect(rv.type).toBe('bar')
    expect(rv.name).toBe('Radial Velocity')
    expect(rv.x).toEqual([2008])
    expect(rv.y).toEqual([1])
    expect(rv.marker.color).toBe(getDiscoveryMethodColor('Radial Velocity'))
  })

  it('sums counts for duplicate year/method pairs', () => {
    const [trace] = traces([
      { year: 2010, discovery_method: 'Imaging', count: 2 },
      { year: 2010, discovery_method: 'Imaging', count: 3 },
      { year: 2011, discovery_method: 'Imaging', count: 1 },
    ])

    expect(trace.x).toEqual([2010, 2011])
    expect(trace.y).toEqual([5, 1])
  })

  it('excludes null years and drops methods left with no items', () => {
    const result = traces([
      { year: null, discovery_method: 'Transit', count: 100 },
      { year: 2010, discovery_method: 'Transit', count: 1 },
      { year: null, discovery_method: 'Astrometry', count: 4 },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Transit')
    expect(result[0].x).toEqual([2010])
    expect(result[0].y).toEqual([1])
  })

  it('returns an empty array when every item has a null year', () => {
    expect(
      buildTimelineTraces([
        { year: null, discovery_method: 'Transit', count: 1 },
        { year: null, discovery_method: null, count: 2 },
      ]),
    ).toEqual([])
  })

  it('orders traces by total count descending, ties by name ascending', () => {
    const result = traces([
      { year: 2000, discovery_method: 'Imaging', count: 3 },
      { year: 2001, discovery_method: 'Transit', count: 10 },
      { year: 2000, discovery_method: 'Astrometry', count: 3 },
      { year: 2002, discovery_method: 'Microlensing', count: 1 },
      { year: 2003, discovery_method: 'Microlensing', count: 1 },
    ])

    expect(result.map((trace) => trace.name)).toEqual([
      'Transit',
      'Astrometry',
      'Imaging',
      'Microlensing',
    ])
  })

  it('groups null discovery_method items into a single "Not available" trace with the fallback color', () => {
    const result = traces([
      { year: 2001, discovery_method: null, count: 1 },
      { year: 2000, discovery_method: null, count: 2 },
      { year: 2001, discovery_method: null, count: 4 },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Not available')
    expect(result[0].x).toEqual([2000, 2001])
    expect(result[0].y).toEqual([2, 5])
    expect(result[0].marker.color).toBe(getDiscoveryMethodColor(null))
  })

  it('sets customdata to the years and a hovertemplate with x, y, the method name and <extra></extra>', () => {
    const result = traces([
      { year: 2012, discovery_method: 'Radial Velocity', count: 7 },
      { year: 2003, discovery_method: 'Radial Velocity', count: 1 },
      { year: 2010, discovery_method: null, count: 2 },
    ])

    for (const trace of result) {
      expect(trace.customdata).toEqual(trace.x)
      expect(trace.hovertemplate).toContain('%{x}')
      expect(trace.hovertemplate).toContain('%{y}')
      expect(trace.hovertemplate).toContain(trace.name)
      expect(trace.hovertemplate.endsWith('<extra></extra>')).toBe(true)
    }
    expect(result[0].customdata).toEqual([2003, 2012])
  })
})
