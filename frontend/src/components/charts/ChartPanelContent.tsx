import type { ReactNode } from 'react'
import type { ChartDataStatus } from '../../hooks/useChartData'
import { EmptyState } from '../ui/EmptyState'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingState } from '../ui/LoadingState'

type ChartPanelContentProps = {
  status: ChartDataStatus
  errorMessage: string | null
  loadingText: string
  emptyText: string
  hasChart: boolean
  children: ReactNode
}

export function ChartPanelContent({
  status,
  errorMessage,
  loadingText,
  emptyText,
  hasChart,
  children,
}: ChartPanelContentProps) {
  // Every slot keeps a fixed position so the chart is not remounted when the
  // loading message appears or disappears around it.
  const showChart = hasChart && (status === 'ready' || status === 'loading')
  return (
    <>
      {status === 'waiting' ? (
        <LoadingState className="chart-panel__status">Waiting for API connection…</LoadingState>
      ) : null}
      {status === 'loading' ? (
        <LoadingState className="chart-panel__status">{loadingText}</LoadingState>
      ) : null}
      {status === 'error' ? (
        <ErrorMessage className="chart-panel__status chart-panel__status--error">
          {errorMessage}
        </ErrorMessage>
      ) : null}
      {status === 'ready' && !hasChart ? (
        <EmptyState className="chart-panel__status">{emptyText}</EmptyState>
      ) : null}
      {showChart ? children : null}
    </>
  )
}
