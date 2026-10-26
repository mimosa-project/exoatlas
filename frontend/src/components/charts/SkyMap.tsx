import { useId, useMemo, useState } from 'react'
import { getSkyMap } from '../../api/charts'
import { useChartData } from '../../hooks/useChartData'
import {
  buildSkyMapLayout,
  buildSkyMapTraces,
  planetNameFromCustomData,
} from '../../utils/chart'
import type { ChartFilterQueryParams } from '../../types/api'
import { ChartPanelContent } from './ChartPanelContent'
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type SkyMapProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}

export function SkyMap({ queryParams, disabled = false, onSelectPlanet }: SkyMapProps) {
  const titleId = useId()
  const { status, data, errorMessage } = useChartData(getSkyMap, queryParams, disabled)

  const traces = useMemo(() => (data ? buildSkyMapTraces(data.items) : []), [data])
  // Built per instance: Plotly writes UI state (zoom) into the layout object.
  const [layout] = useState(buildSkyMapLayout)

  function handlePointClick(point: PlotlyPointClick) {
    const planetName = planetNameFromCustomData(point.customdata)
    if (planetName != null) {
      onSelectPlanet(planetName)
    }
  }

  return (
    <section className="dashboard-panel chart-panel" aria-labelledby={titleId}>
      <h2 id={titleId} className="dashboard-panel__title">
        Sky map
      </h2>
      <ChartPanelContent
        status={status}
        errorMessage={errorMessage}
        loadingText="Loading sky map…"
        emptyText="No planets match the current filters."
        hasChart={traces.length > 0}
      >
        <PlotlyChart
          data={traces}
          layout={layout}
          ariaLabel="Sky map chart"
          onPointClick={handlePointClick}
        />
      </ChartPanelContent>
    </section>
  )
}
