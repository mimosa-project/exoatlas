import { useId, useMemo, useState } from 'react'
import { getOrbitScatter } from '../../api/charts'
import { useChartData } from '../../hooks/useChartData'
import {
  buildOrbitScatterLayout,
  buildOrbitScatterTraces,
  planetNameFromCustomData,
} from '../../utils/chart'
import type {
  ChartFilterQueryParams,
  ScatterOrbitRadiusResponse,
  ScatterYAxis,
} from '../../types/api'
import { ChartPanelContent } from './ChartPanelContent'
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type OrbitScatterPlotProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}

type ScatterResult = {
  yAxis: ScatterYAxis
  response: ScatterOrbitRadiusResponse
}

type ScatterParams = ChartFilterQueryParams & { y_axis: ScatterYAxis }

// Tags the response with the Y axis it was fetched for, so the data and layout
// on screen keep matching while a new axis is loading.
async function fetchOrbitScatter(
  params: ScatterParams,
  signal: AbortSignal,
): Promise<ScatterResult> {
  return { yAxis: params.y_axis, response: await getOrbitScatter(params, { signal }) }
}

const Y_AXIS_OPTIONS: { value: ScatterYAxis; label: string }[] = [
  { value: 'radius', label: 'Radius' },
  { value: 'mass', label: 'Mass' },
]

export function OrbitScatterPlot({
  queryParams,
  disabled = false,
  onSelectPlanet,
}: OrbitScatterPlotProps) {
  const idPrefix = useId()
  const titleId = `${idPrefix}-title`
  const [yAxis, setYAxis] = useState<ScatterYAxis>('radius')
  const [logScale, setLogScale] = useState(true)
  const params = useMemo<ScatterParams>(
    () => ({ ...queryParams, y_axis: yAxis }),
    [queryParams, yAxis],
  )
  const { status, data: result, errorMessage } = useChartData(
    fetchOrbitScatter,
    params,
    disabled,
  )

  const traces = useMemo(
    () => (result ? buildOrbitScatterTraces(result.response.items, result.yAxis) : []),
    [result],
  )
  const fetchedYAxis = result?.yAxis ?? yAxis
  const layout = useMemo(
    () => buildOrbitScatterLayout(fetchedYAxis, logScale),
    [fetchedYAxis, logScale],
  )

  function handlePointClick(point: PlotlyPointClick) {
    const planetName = planetNameFromCustomData(point.customdata)
    if (planetName != null) {
      onSelectPlanet(planetName)
    }
  }

  return (
    <section className="dashboard-panel chart-panel" aria-labelledby={titleId}>
      <div className="chart-panel__header">
        <h2 id={titleId} className="dashboard-panel__title">
          Orbit scatter plot
        </h2>
        <div className="chart-panel__controls">
          <fieldset className="chart-panel__fieldset" disabled={disabled}>
            <legend className="chart-panel__legend">Y axis</legend>
            {Y_AXIS_OPTIONS.map((option) => (
              <label key={option.value} className="chart-panel__option">
                <input
                  type="radio"
                  name={`${idPrefix}-y-axis`}
                  value={option.value}
                  checked={yAxis === option.value}
                  onChange={() => setYAxis(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <label className="chart-panel__option">
            <input
              type="checkbox"
              checked={logScale}
              disabled={disabled}
              onChange={(event) => setLogScale(event.target.checked)}
            />
            Log scale
          </label>
        </div>
      </div>
      <ChartPanelContent
        status={status}
        errorMessage={errorMessage}
        loadingText="Loading orbit scatter plot…"
        emptyText="No planets match the current filters."
        hasChart={traces.length > 0}
      >
        <PlotlyChart
          data={traces}
          layout={layout}
          ariaLabel="Orbit scatter plot chart"
          onPointClick={handlePointClick}
        />
      </ChartPanelContent>
    </section>
  )
}
