import type { Layout, PlotData } from 'plotly.js'
import {
  formatDegrees,
  formatDistance,
  formatMass,
  formatOrbitalPeriod,
  formatRadius,
  NOT_AVAILABLE_TEXT,
} from './format'
import type {
  DiscoveryTimelineItem,
  ScatterOrbitRadiusItem,
  ScatterYAxis,
  SkyMapItem,
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

export type SkyMapTrace = Partial<PlotData> & {
  type: 'scatter'
  mode: 'markers'
  name: string
  x: number[]
  y: number[]
  customdata: string[][]
  hovertemplate: string
  marker: { color: string; opacity: number }
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

type MethodPointGroup = {
  name: string
  method: string | null
  x: number[]
  y: number[]
  customdata: string[][]
}

type MethodPoint = { x: number; y: number; customdata: string[] }

// Groups points into one series per discovery method label (null methods
// collapse into "Not available"), ordered by point count then name.
function groupPointsByMethod<T extends { discovery_method: string | null }>(
  items: T[],
  toPoint: (item: T) => MethodPoint | null,
): MethodPointGroup[] {
  const groups = new Map<string, MethodPointGroup>()

  for (const item of items) {
    const point = toPoint(item)
    if (!point) {
      continue
    }
    const name = formatDiscoveryMethodLabel(item.discovery_method)
    let group = groups.get(name)
    if (!group) {
      group = { name, method: item.discovery_method, x: [], y: [], customdata: [] }
      groups.set(name, group)
    }
    group.x.push(point.x)
    group.y.push(point.y)
    group.customdata.push(point.customdata)
  }

  return [...groups.values()].sort(
    (a, b) => b.x.length - a.x.length || a.name.localeCompare(b.name),
  )
}

export function buildOrbitScatterTraces(
  items: ScatterOrbitRadiusItem[],
  yAxis: ScatterYAxis,
): OrbitScatterTrace[] {
  const groups = groupPointsByMethod(items, (item) => {
    const x = item.orbital_period_days
    const y = yAxis === 'radius' ? item.radius_earth : item.mass_earth
    if (x == null || y == null) {
      return null
    }
    return { x, y, customdata: toScatterCustomData(item) }
  })

  return groups.map((group) => ({
    type: 'scatter',
    mode: 'markers',
    name: group.name,
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
      `Method: ${group.name}<extra></extra>`,
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

const SKY_MAP_MARKER_OPACITY = 0.6

function toSkyMapCustomData(item: SkyMapItem): string[] {
  return [
    item.planet_name ?? NOT_AVAILABLE_TEXT,
    item.host_name ?? NOT_AVAILABLE_TEXT,
    item.discovery_year != null ? String(item.discovery_year) : NOT_AVAILABLE_TEXT,
    formatDegrees(item.right_ascension),
    formatDegrees(item.declination),
    formatDistance(item.distance_parsec),
  ]
}

export function buildSkyMapTraces(items: SkyMapItem[]): SkyMapTrace[] {
  const groups = groupPointsByMethod(items, (item) => {
    if (item.right_ascension == null || item.declination == null) {
      return null
    }
    return {
      x: item.right_ascension,
      y: item.declination,
      customdata: toSkyMapCustomData(item),
    }
  })

  return groups.map((group) => ({
    type: 'scatter',
    mode: 'markers',
    name: group.name,
    x: group.x,
    y: group.y,
    customdata: group.customdata,
    hovertemplate:
      '<b>%{customdata[0]}</b><br>' +
      'Host: %{customdata[1]}<br>' +
      'Discovery year: %{customdata[2]}<br>' +
      'RA: %{customdata[3]}<br>' +
      'Dec: %{customdata[4]}<br>' +
      'Distance: %{customdata[5]}<br>' +
      `Method: ${group.name}<extra></extra>`,
    marker: {
      color: getDiscoveryMethodColor(group.method),
      opacity: SKY_MAP_MARKER_OPACITY,
    },
  }))
}

export function buildSkyMapLayout(): Partial<Layout> {
  return {
    showlegend: true,
    hovermode: 'closest',
    // Right ascension increases to the left, as on a sky chart.
    xaxis: { title: { text: 'Right ascension (°)' }, range: [360, 0] },
    yaxis: { title: { text: 'Declination (°)' }, range: [-90, 90] },
  }
}

// Planet name of a clicked scatter point whose customdata starts with the
// display name, or null when the point cannot open the detail drawer.
export function planetNameFromCustomData(customdata: unknown): string | null {
  if (!Array.isArray(customdata)) {
    return null
  }
  const [planetName] = customdata as unknown[]
  if (
    typeof planetName !== 'string' ||
    planetName.trim().length === 0 ||
    planetName === NOT_AVAILABLE_TEXT
  ) {
    return null
  }
  return planetName
}
