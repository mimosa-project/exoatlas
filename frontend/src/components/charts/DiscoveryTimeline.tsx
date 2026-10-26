import { useId, useMemo, useState } from 'react'
import { getDiscoveryTimeline } from '../../api/discoveries'
import { useChartData } from '../../hooks/useChartData'
import { buildTimelineLayout, buildTimelineTraces } from '../../utils/chart'
import type { ChartFilterQueryParams } from '../../types/api'
import { ChartPanelContent } from './ChartPanelContent'
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type DiscoveryTimelineProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectYear: (year: number) => void
}

function toYear(point: PlotlyPointClick): number | null {
  const value = point.customdata ?? point.x
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const year = Number(value)
    return Number.isInteger(year) ? year : null
  }
  return null
}

export function DiscoveryTimeline({
  queryParams,
  disabled = false,
  onSelectYear,
}: DiscoveryTimelineProps) {
  const titleId = useId()
  const params = useMemo(
    () => ({ ...queryParams, group_by_method: true }),
    [queryParams],
  )
  const { status, data, errorMessage } = useChartData(getDiscoveryTimeline, params, disabled)

  const traces = useMemo(() => (data ? buildTimelineTraces(data.items) : []), [data])
  // Built per instance: Plotly writes UI state (zoom) into the layout object.
  const [layout] = useState(buildTimelineLayout)

  function handlePointClick(point: PlotlyPointClick) {
    const year = toYear(point)
    if (year != null) {
      onSelectYear(year)
    }
  }

  return (
    <section className="dashboard-panel chart-panel" aria-labelledby={titleId}>
      <h2 id={titleId} className="dashboard-panel__title">
        Discovery timeline
      </h2>
      <ChartPanelContent
        status={status}
        errorMessage={errorMessage}
        loadingText="Loading discovery timeline…"
        emptyText="No discoveries match the current filters."
        hasChart={traces.length > 0}
      >
        <PlotlyChart
          data={traces}
          layout={layout}
          ariaLabel="Discovery timeline chart"
          onPointClick={handlePointClick}
        />
      </ChartPanelContent>
    </section>
  )
}
