import { describe, expect, it } from 'vitest'
import {
  buildOrbitScatterLayout,
  buildOrbitScatterTraces,
  buildSkyMapLayout,
  buildSkyMapTraces,
  buildTimelineLayout,
  buildTimelineTraces,
} from './chart'

describe('chart layouts with uirevision (chart-refetch AC 20-21)', () => {
  it('builds the timeline layout with the previous keys, the theme and uirevision', () => {
    expect(buildTimelineLayout()).toMatchObject({
      barmode: 'stack',
      showlegend: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { title: { text: 'Discovery year' }, tickformat: 'd' },
      yaxis: { title: { text: 'Planets' } },
      uirevision: 'discovery-timeline',
    })
  })

  it('sets uirevision on the sky map layout', () => {
    expect(buildSkyMapLayout().uirevision).toBe('sky-map')
  })

  it.each([
    ['radius', true, 'orbit-scatter-radius-log'],
    ['radius', false, 'orbit-scatter-radius-linear'],
    ['mass', true, 'orbit-scatter-mass-log'],
    ['mass', false, 'orbit-scatter-mass-linear'],
  ] as const)('sets uirevision on the scatter layout for %s / log=%s', (yAxis, logScale, expected) => {
    expect(buildOrbitScatterLayout(yAxis, logScale).uirevision).toBe(expected)
  })

  it.each([
    ['timeline', () => buildTimelineLayout()],
    ['sky map', () => buildSkyMapLayout()],
    ['scatter', () => buildOrbitScatterLayout('radius', true)],
  ])('returns a new object with new nested axes on every call (%s)', (_label, build) => {
    const a = build()
    const b = build()

    expect(a).not.toBe(b)
    expect(a.xaxis).not.toBe(b.xaxis)
    expect(a.yaxis).not.toBe(b.yaxis)
    expect(a).toEqual(b)
  })
})

describe('trace uid equals the series name (chart-refetch AC 20a)', () => {
  it('sets uid on timeline traces', () => {
    const traces = buildTimelineTraces([
      { year: 2000, discovery_method: 'Transit', count: 1 },
      { year: 2001, discovery_method: null, count: 2 },
    ])
    for (const trace of traces) {
      expect(trace.uid).toBe(trace.name)
    }
    expect(traces.map((trace) => trace.uid).sort()).toEqual(['Not available', 'Transit'])
  })

  it('sets uid on orbit scatter traces', () => {
    const traces = buildOrbitScatterTraces(
      [
        {
          id: 1,
          planet_name: 'A b',
          host_name: 'A',
          discovery_method: 'Imaging',
          discovery_year: 2000,
          orbital_period_days: 1,
          radius_earth: 1,
          mass_earth: 1,
        },
      ],
      'radius',
    )
    expect(traces[0].uid).toBe('Imaging')
  })

  it('sets uid on sky map traces', () => {
    const traces = buildSkyMapTraces([
      {
        id: 1,
        planet_name: 'A b',
        host_name: 'A',
        discovery_method: null,
        discovery_year: 2000,
        right_ascension: 1,
        declination: 1,
        distance_parsec: 1,
      },
    ])
    expect(traces[0].uid).toBe('Not available')
  })
})
