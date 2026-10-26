import { describe, expect, it } from 'vitest'
import {
  buildOrbitScatterLayout,
  buildSkyMapLayout,
  withChartTheme,
} from './chart'

const BORDER = '#2f3d52'

describe('withChartTheme (state polish AC 9)', () => {
  it('applies the theme defaults to an empty layout', () => {
    expect(withChartTheme({})).toEqual({
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#e7ecf3' },
      xaxis: { gridcolor: BORDER, zerolinecolor: BORDER, automargin: true },
      yaxis: { gridcolor: BORDER, zerolinecolor: BORDER, automargin: true },
      legend: { orientation: 'h', x: 0, y: -0.25, yanchor: 'top' },
      margin: { t: 16, r: 16, b: 48, l: 56 },
    })
  })

  it('keeps input keys and merges axes one level deep', () => {
    const themed = withChartTheme({
      barmode: 'stack',
      xaxis: { title: { text: 'Year' }, tickformat: 'd' },
      yaxis: { title: { text: 'Planets' }, type: 'log', range: [0, 3] },
    })

    expect(themed.barmode).toBe('stack')
    expect(themed.xaxis).toEqual({
      gridcolor: BORDER,
      zerolinecolor: BORDER,
      automargin: true,
      title: { text: 'Year' },
      tickformat: 'd',
    })
    expect(themed.yaxis).toEqual({
      gridcolor: BORDER,
      zerolinecolor: BORDER,
      automargin: true,
      title: { text: 'Planets' },
      type: 'log',
      range: [0, 3],
    })
  })

  it('lets input values win for every key, merging font/legend/margin one level deep', () => {
    const themed = withChartTheme({
      paper_bgcolor: '#000000',
      font: { size: 10 },
      legend: { y: -0.4 },
      margin: { b: 80 },
      xaxis: { gridcolor: '#ffffff' },
    })

    expect(themed.paper_bgcolor).toBe('#000000')
    expect(themed.plot_bgcolor).toBe('rgba(0,0,0,0)')
    expect(themed.font).toEqual({ color: '#e7ecf3', size: 10 })
    expect(themed.legend).toEqual({ orientation: 'h', x: 0, y: -0.4, yanchor: 'top' })
    expect(themed.margin).toEqual({ t: 16, r: 16, b: 80, l: 56 })
    expect(themed.xaxis).toMatchObject({ gridcolor: '#ffffff', zerolinecolor: BORDER })
  })

  it('returns fresh nested objects on every call', () => {
    const a = withChartTheme({})
    const b = withChartTheme({})

    expect(a.font).not.toBe(b.font)
    expect(a.xaxis).not.toBe(b.xaxis)
    expect(a.yaxis).not.toBe(b.yaxis)
    expect(a.legend).not.toBe(b.legend)
    expect(a.margin).not.toBe(b.margin)
    expect(a.xaxis).not.toBe(a.yaxis)
  })

  it('does not mutate the input layout', () => {
    const input = { xaxis: { title: { text: 'X' } }, margin: { b: 80 } }
    const snapshot = structuredClone(input)

    withChartTheme(input)

    expect(input).toEqual(snapshot)
  })
})

describe('chart layouts apply the theme (state polish AC 10)', () => {
  it.each([
    ['orbit scatter (radius, log)', () => buildOrbitScatterLayout('radius', true)],
    ['orbit scatter (mass, linear)', () => buildOrbitScatterLayout('mass', false)],
    ['sky map', () => buildSkyMapLayout()],
  ])('%s layout is themed', (_label, build) => {
    expect(build()).toMatchObject({
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#e7ecf3' },
      xaxis: { gridcolor: BORDER },
      yaxis: { gridcolor: BORDER },
      legend: { orientation: 'h' },
    })
  })

  it('keeps the existing scatter and sky map keys', () => {
    expect(buildOrbitScatterLayout('mass', false)).toMatchObject({
      showlegend: true,
      hovermode: 'closest',
      xaxis: { title: { text: 'Orbital period (days)' }, type: 'linear' },
      yaxis: { title: { text: 'Mass (Earth masses)' }, type: 'linear' },
    })
    expect(buildSkyMapLayout()).toMatchObject({
      xaxis: { title: { text: 'Right ascension (°)' }, range: [360, 0] },
      yaxis: { title: { text: 'Declination (°)' }, range: [-90, 90] },
    })
  })
})
