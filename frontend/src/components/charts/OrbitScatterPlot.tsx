import { useEffect, useId, useMemo, useState } from 'react'
import { getOrbitScatter } from '../../api/charts'
import { ApiError } from '../../api/client'
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
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type OrbitScatterPlotProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}

type FetchStatus = 'waiting' | 'loading' | 'ready' | 'error'

type ScatterResult = {
  yAxis: ScatterYAxis
  response: ScatterOrbitRadiusResponse
}

const Y_AXIS_OPTIONS: { value: ScatterYAxis; label: string }[] = [
  { value: 'radius', label: 'Radius' },
  { value: 'mass', label: 'Mass' },
]

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

export function OrbitScatterPlot({
  queryParams,
  disabled = false,
  onSelectPlanet,
}: OrbitScatterPlotProps) {
  const idPrefix = useId()
  const titleId = `${idPrefix}-title`
  const [yAxis, setYAxis] = useState<ScatterYAxis>('radius')
  const [logScale, setLogScale] = useState(true)
  const [status, setStatus] = useState<FetchStatus>(disabled ? 'waiting' : 'loading')
  const [result, setResult] = useState<ScatterResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (disabled) {
      setStatus('waiting')
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)

    async function load(requestedYAxis: ScatterYAxis) {
      try {
        const response = await getOrbitScatter({
          ...queryParams,
          y_axis: requestedYAxis,
        })

        if (cancelled) {
          return
        }

        setResult({ yAxis: requestedYAxis, response })
        setStatus('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        setResult(null)
        setErrorMessage(toErrorMessage(error))
        setStatus('error')
      }
    }

    void load(yAxis)

    return () => {
      cancelled = true
    }
  }, [queryParams, yAxis, disabled])

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
      {status === 'waiting' ? (
        <p className="chart-panel__status" role="status">
          Waiting for API connection…
        </p>
      ) : null}
      {status === 'loading' ? (
        <p className="chart-panel__status" role="status">
          Loading orbit scatter plot…
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="chart-panel__status chart-panel__status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {status === 'ready' && traces.length === 0 ? (
        <p className="chart-panel__status">No planets match the current filters.</p>
      ) : null}
      {status === 'ready' && traces.length > 0 ? (
        <PlotlyChart
          data={traces}
          layout={layout}
          ariaLabel="Orbit scatter plot chart"
          onPointClick={handlePointClick}
        />
      ) : null}
    </section>
  )
}
