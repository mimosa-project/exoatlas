import { useEffect, useId, useMemo, useState } from 'react'
import type { Layout } from 'plotly.js'
import { getDiscoveryTimeline } from '../../api/discoveries'
import { buildTimelineTraces, withChartTheme } from '../../utils/chart'
import type {
  ChartFilterQueryParams,
  DiscoveryTimelineResponse,
} from '../../types/api'
import { toErrorMessage } from '../../utils/error'
import { EmptyState } from '../ui/EmptyState'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingState } from '../ui/LoadingState'
import { PlotlyChart, type PlotlyPointClick } from './PlotlyChart'

type DiscoveryTimelineProps = {
  queryParams: ChartFilterQueryParams
  disabled?: boolean
  onSelectYear: (year: number) => void
}

type FetchStatus = 'waiting' | 'loading' | 'ready' | 'error'

const TIMELINE_LAYOUT: Partial<Layout> = withChartTheme({
  barmode: 'stack',
  showlegend: true,
  xaxis: { title: { text: 'Discovery year' }, tickformat: 'd' },
  yaxis: { title: { text: 'Planets' } },
})

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
        <LoadingState className="chart-panel__status">
          Waiting for API connection…
        </LoadingState>
      ) : null}
      {status === 'loading' ? (
        <LoadingState className="chart-panel__status">
          Loading discovery timeline…
        </LoadingState>
      ) : null}
      {status === 'error' ? (
        <ErrorMessage className="chart-panel__status chart-panel__status--error">
          {errorMessage}
        </ErrorMessage>
      ) : null}
      {status === 'ready' && traces.length === 0 ? (
        <EmptyState className="chart-panel__status">
          No discoveries match the current filters.
        </EmptyState>
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
