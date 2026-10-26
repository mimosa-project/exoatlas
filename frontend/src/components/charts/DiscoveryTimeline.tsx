import { useEffect, useId, useMemo, useState } from 'react'
import type { Layout } from 'plotly.js'
import { ApiError } from '../../api/client'
import { getDiscoveryTimeline } from '../../api/discoveries'
import { buildTimelineTraces } from '../../utils/chart'
import type {
  ChartFilterQueryParams,
  DiscoveryTimelineResponse,
} from '../../types/api'
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type DiscoveryTimelineProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectYear: (year: number) => void
}

type FetchStatus = 'waiting' | 'loading' | 'ready' | 'error'

const TIMELINE_LAYOUT: Partial<Layout> = {
  barmode: 'stack',
  showlegend: true,
  xaxis: { title: { text: 'Discovery year' }, tickformat: 'd' },
  yaxis: { title: { text: 'Planets' } },
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
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
  const [status, setStatus] = useState<FetchStatus>(disabled ? 'waiting' : 'loading')
  const [data, setData] = useState<DiscoveryTimelineResponse | null>(null)
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
        const response = await getDiscoveryTimeline({
          ...queryParams,
          group_by_method: true,
        })

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

  const traces = useMemo(
    () => (data ? buildTimelineTraces(data.items) : []),
    [data],
  )

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
      {status === 'waiting' ? (
        <p className="chart-panel__status" role="status">
          Waiting for API connection…
        </p>
      ) : null}
      {status === 'loading' ? (
        <p className="chart-panel__status" role="status" aria-live="polite">
          Loading discovery timeline…
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="chart-panel__status chart-panel__status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {status === 'ready' && traces.length === 0 ? (
        <p className="chart-panel__status">No discoveries match the current filters.</p>
      ) : null}
      {status === 'ready' && traces.length > 0 ? (
        <PlotlyChart
          data={traces}
          layout={TIMELINE_LAYOUT}
          ariaLabel="Discovery timeline chart"
          onPointClick={handlePointClick}
        />
      ) : null}
    </section>
  )
}
