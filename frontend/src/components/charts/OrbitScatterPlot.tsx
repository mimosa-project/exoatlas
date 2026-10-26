import { useEffect, useId, useMemo, useState } from 'react'
import { getOrbitScatter } from '../../api/charts'
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
import { toErrorMessage } from '../../utils/error'
import { EmptyState } from '../ui/EmptyState'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingState } from '../ui/LoadingState'
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
        <LoadingState className="chart-panel__status">
          Waiting for API connection…
        </LoadingState>
      ) : null}
      {status === 'loading' ? (
        <LoadingState className="chart-panel__status">
          Loading orbit scatter plot…
        </LoadingState>
      ) : null}
      {status === 'error' ? (
        <ErrorMessage className="chart-panel__status chart-panel__status--error">
          {errorMessage}
        </ErrorMessage>
      ) : null}
      {status === 'ready' && traces.length === 0 ? (
        <EmptyState className="chart-panel__status">
          No planets match the current filters.
        </EmptyState>
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
