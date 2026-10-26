import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartPanelContent } from './ChartPanelContent'
import type { ChartDataStatus } from '../../hooks/useChartData'

function renderContent(status: ChartDataStatus, hasChart: boolean, errorMessage: string | null = null) {
  return render(
    <ChartPanelContent
      status={status}
      errorMessage={errorMessage}
      loadingText="Loading things…"
      emptyText="Nothing to show."
      hasChart={hasChart}
    >
      <div data-testid="chart" />
    </ChartPanelContent>,
  )
}

describe('ChartPanelContent (chart-refetch AC 11-15)', () => {
  it.each([true, false])('shows only the waiting status when waiting (hasChart=%s) (AC 11)', (hasChart) => {
    renderContent('waiting', hasChart)

    expect(screen.getByRole('status')).toHaveTextContent('Waiting for API connection…')
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing to show.')).not.toBeInTheDocument()
  })

  it('shows the loading status together with the previous chart while loading (AC 12)', () => {
    renderContent('loading', true)

    expect(screen.getByRole('status')).toHaveTextContent('Loading things…')
    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.getByRole('status').nextElementSibling).toBe(screen.getByTestId('chart'))
  })

  it('shows only the loading status while loading without a chart (AC 12)', () => {
    renderContent('loading', false)

    expect(screen.getByRole('status')).toHaveTextContent('Loading things…')
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing to show.')).not.toBeInTheDocument()
  })

  it.each([true, false])('shows only the error message on error (hasChart=%s) (AC 13)', (hasChart) => {
    renderContent('error', hasChart, 'Request failed')

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('shows the chart when ready with a chart (AC 14)', () => {
    renderContent('ready', true)

    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing to show.')).not.toBeInTheDocument()
  })

  it('shows the empty message without a role when ready without a chart (AC 14)', () => {
    renderContent('ready', false)

    const empty = screen.getByText('Nothing to show.')
    expect(empty).not.toHaveAttribute('role')
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('keeps the panel status classes (AC 15)', () => {
    const { unmount } = renderContent('loading', false)
    expect(screen.getByRole('status')).toHaveClass('chart-panel__status')
    unmount()

    renderContent('error', false, 'Oops')
    expect(screen.getByRole('alert')).toHaveClass('chart-panel__status', 'chart-panel__status--error')
  })
})
