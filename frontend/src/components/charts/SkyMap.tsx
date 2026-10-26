import { useEffect, useId, useMemo, useState } from 'react'
import { getSkyMap } from '../../api/charts'
import {
  buildSkyMapLayout,
  buildSkyMapTraces,
  planetNameFromCustomData,
} from '../../utils/chart'
import type { ChartFilterQueryParams, SkyMapResponse } from '../../types/api'
import { toErrorMessage } from '../../utils/error'
import { EmptyState } from '../ui/EmptyState'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingState } from '../ui/LoadingState'
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type SkyMapProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}

type FetchStatus = 'waiting' | 'loading' | 'ready' | 'error'

const SKY_MAP_LAYOUT = buildSkyMapLayout()

export function SkyMap({ queryParams, disabled = false, onSelectPlanet }: SkyMapProps) {
  const titleId = useId()
  const [status, setStatus] = useState<FetchStatus>(disabled ? 'waiting' : 'loading')
  const [data, setData] = useState<SkyMapResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (disabled) {
      setStatus('waiting')
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)

    async function load() {
      try {
        const response = await getSkyMap(queryParams)

        if (cancelled) {
          return
        }

        setData(response)
        setStatus('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        setData(null)
        setErrorMessage(toErrorMessage(error))
        setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [queryParams, disabled])

  const traces = useMemo(() => (data ? buildSkyMapTraces(data.items) : []), [data])

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
      {status === 'waiting' ? (
        <LoadingState className="chart-panel__status">
          Waiting for API connection…
        </LoadingState>
      ) : null}
      {status === 'loading' ? (
        <LoadingState className="chart-panel__status">
          Loading sky map…
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
          layout={SKY_MAP_LAYOUT}
          ariaLabel="Sky map chart"
          onPointClick={handlePointClick}
        />
      ) : null}
    </section>
  )
}
