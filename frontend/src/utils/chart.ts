import type { Layout, PlotData } from 'plotly.js'
import {
  formatMass,
  formatOrbitalPeriod,
  formatRadius,
  NOT_AVAILABLE_TEXT,
} from './format'
import type {
  DiscoveryTimelineItem,
  ScatterOrbitRadiusItem,
  ScatterYAxis,
} from '../types/api'

const DISCOVERY_METHOD_COLORS: Record<string, string> = {
  Transit: '#4c9aff',
  'Radial Velocity': '#f5a623',
  Microlensing: '#7ed321',
  Imaging: '#c86dd7',
  'Transit Timing Variations': '#50e3c2',
  'Eclipse Timing Variations': '#ff6f61',
  'Orbital Brightness Modulation': '#f8e71c',
  'Pulsar Timing': '#9b9bff',
  Astrometry: '#ff9ecb',
  'Pulsation Timing Variations': '#8fbf6a',
  'Disk Kinematics': '#c4a484',
}

const FALLBACK_COLOR = '#8b9aab'

export type TimelineTrace = Partial<PlotData> & {
  type: 'bar'
  name: string
  x: number[]
  y: number[]
  customdata: number[]
  hovertemplate: string
  marker: { color: string }
}

export type OrbitScatterTrace = Partial<PlotData> & {
  type: 'scatter'
  mode: 'markers'
  name: string
  x: number[]
  y: number[]
  customdata: string[][]
  hovertemplate: string
  marker: { color: string }
}

export function getDiscoveryMethodColor(method: string | null): string {
  if (method != null && Object.hasOwn(DISCOVERY_METHOD_COLORS, method)) {
    return DISCOVERY_METHOD_COLORS[method]
  }
  return FALLBACK_COLOR
}

export function formatDiscoveryMethodLabel(method: string | null): string {
  return method ?? NOT_AVAILABLE_TEXT
}

export function buildTimelineTraces(items: DiscoveryTimelineItem[]): TimelineTrace[] {
  // Keyed by the method label so that null methods collapse into one series.
  const countsByMethod = new Map<
    string,
    { method: string | null; counts: Map<number, number>; total: number }
  >()

  for (const item of items) {
    if (item.year == null) {
      continue
    }
    const name = formatDiscoveryMethodLabel(item.discovery_method)
    let group = countsByMethod.get(name)
    if (!group) {
      group = { method: item.discovery_method, counts: new Map(), total: 0 }
      countsByMethod.set(name, group)
    }
    group.counts.set(item.year, (group.counts.get(item.year) ?? 0) + item.count)
    group.total += item.count
  }

  return [...countsByMethod.entries()]
    .sort(([nameA, a], [nameB, b]) => b.total - a.total || nameA.localeCompare(nameB))
    .map(([name, group]) => {
      const years = [...group.counts.keys()].sort((a, b) => a - b)
      return {
        type: 'bar',
        name,
        x: years,
        y: years.map((year) => group.counts.get(year) ?? 0),
        customdata: years,
        hovertemplate: `${name}<br>Year: %{x}<br>Planets: %{y}<extra></extra>`,
        marker: { color: getDiscoveryMethodColor(group.method) },
      }
    })
}

const SCATTER_Y_AXIS_TITLES: Record<ScatterYAxis, string> = {
  radius: 'Radius (Earth radii)',
  mass: 'Mass (Earth masses)',
}

function toScatterCustomData(item: ScatterOrbitRadiusItem): string[] {
  return [
    item.planet_name ?? NOT_AVAILABLE_TEXT,
    item.host_name ?? NOT_AVAILABLE_TEXT,
    item.discovery_year != null ? String(item.discovery_year) : NOT_AVAILABLE_TEXT,
    formatRadius(item.radius_earth),
    formatMass(item.mass_earth),
    formatOrbitalPeriod(item.orbital_period_days),
  ]
}

export function buildOrbitScatterTraces(
  items: ScatterOrbitRadiusItem[],
  yAxis: ScatterYAxis,
): OrbitScatterTrace[] {
  // Keyed by the method label so that null methods collapse into one series.
  const pointsByMethod = new Map<
    string,
    { method: string | null; x: number[]; y: number[]; customdata: string[][] }
  >()

  for (const item of items) {
    const x = item.orbital_period_days
    const y = yAxis === 'radius' ? item.radius_earth : item.mass_earth
    if (x == null || y == null) {
      continue
    }
    const name = formatDiscoveryMethodLabel(item.discovery_method)
    let group = pointsByMethod.get(name)
    if (!group) {
      group = { method: item.discovery_method, x: [], y: [], customdata: [] }
      pointsByMethod.set(name, group)
    }
    group.x.push(x)
    group.y.push(y)
    group.customdata.push(toScatterCustomData(item))
  }

  return [...pointsByMethod.entries()]
    .sort(
      ([nameA, a], [nameB, b]) => b.x.length - a.x.length || nameA.localeCompare(nameB),
    )
    .map(([name, group]) => ({
      type: 'scatter',
      mode: 'markers',
      name,
      x: group.x,
      y: group.y,
      customdata: group.customdata,
      hovertemplate:
        '<b>%{customdata[0]}</b><br>' +
        'Host: %{customdata[1]}<br>' +
        'Discovery year: %{customdata[2]}<br>' +
        'Radius: %{customdata[3]}<br>' +
        'Mass: %{customdata[4]}<br>' +
        'Orbital period: %{customdata[5]}<br>' +
        `Method: ${name}<extra></extra>`,
      marker: { color: getDiscoveryMethodColor(group.method) },
    }))
}

export function buildOrbitScatterLayout(
  yAxis: ScatterYAxis,
  logScale: boolean,
): Partial<Layout> {
  const type = logScale ? 'log' : 'linear'
  return {
    showlegend: true,
    hovermode: 'closest',
    xaxis: { title: { text: 'Orbital period (days)' }, type },
    yaxis: { title: { text: SCATTER_Y_AXIS_TITLES[yAxis] }, type },
  }
}
