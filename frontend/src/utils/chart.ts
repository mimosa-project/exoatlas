import type { PlotData } from 'plotly.js'
import type { DiscoveryTimelineItem } from '../types/api'

const NOT_AVAILABLE_TEXT = 'Not available'

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
