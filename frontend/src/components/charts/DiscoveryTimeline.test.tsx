import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { DiscoveryTimeline } from './DiscoveryTimeline'
import type { PlotlyPointClick } from './PlotlyChart'
import { getDiscoveryTimeline } from '../../api/discoveries'
import { ApiError } from '../../api/client'
import { buildTimelineTraces } from '../../utils/chart'
import type {
  ChartFilterQueryParams,
  DiscoveryTimelineItem,
  DiscoveryTimelineResponse,
} from '../../types/api'

type CapturedChartProps = {
  data: unknown[]
  layout: Record<string, unknown>
  ariaLabel: string
  onPointClick?: (point: PlotlyPointClick) => void
}

const chartProps = vi.hoisted(() => vi.fn())

vi.mock('./PlotlyChart', () => ({
  PlotlyChart: (props: CapturedChartProps) => {
    chartProps(props)
    return <div data-testid="plotly-chart" />
  },
}))

vi.mock('../../api/discoveries', () => ({
  getDiscoveryTimeline: vi.fn(),
}))

const getDiscoveryTimelineMock = vi.mocked(getDiscoveryTimeline)

const ITEMS: DiscoveryTimelineItem[] = [
  { year: 2009, discovery_method: 'Transit', count: 2 },
  { year: 2010, discovery_method: 'Transit', count: 5 },
  { year: 2010, discovery_method: 'Radial Velocity', count: 1 },
]

function response(items: DiscoveryTimelineItem[] = ITEMS): DiscoveryTimelineResponse {
  return { items }
}

function lastChartProps(): CapturedChartProps {
  const call = chartProps.mock.calls.at(-1)
  if (!call) {
    throw new Error('PlotlyChart was not rendered')
  }
  return call[0] as CapturedChartProps
}

function clickPoint(point: Partial<PlotlyPointClick>) {
  const full: PlotlyPointClick = {
    x: undefined,
    y: 1,
    customdata: undefined,
    curveNumber: 0,
    pointIndex: 0,
    ...point,
  }
  act(() => lastChartProps().onPointClick?.(full))
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const EMPTY_PARAMS: ChartFilterQueryParams = {}

beforeEach(() => {
  chartProps.mockReset()
  getDiscoveryTimelineMock.mockReset()
})

describe('DiscoveryTimeline states (AC 13-19)', () => {
  it('renders a section named "Discovery timeline" (AC 13)', () => {
    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} disabled onSelectYear={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Discovery timeline' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Discovery timeline' })).toBeInTheDocument()
  })

  it('shows the waiting status and does not fetch or render the chart when disabled (AC 14)', () => {
    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} disabled onSelectYear={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Waiting for API connection…')
    expect(getDiscoveryTimelineMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
  })

  it('starts fetching when disabled changes from true to false (AC 14, 15)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())
    const params: ChartFilterQueryParams = { discovery_method: 'Transit' }

    const { rerender } = render(
      <DiscoveryTimeline queryParams={params} disabled onSelectYear={vi.fn()} />,
    )
    expect(getDiscoveryTimelineMock).not.toHaveBeenCalled()

    rerender(<DiscoveryTimeline queryParams={params} disabled={false} onSelectYear={vi.fn()} />)

    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument()
    expect(getDiscoveryTimelineMock).toHaveBeenCalledTimes(1)
  })

  it('fetches with the query params plus group_by_method: true (AC 15)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())

    render(
      <DiscoveryTimeline
        queryParams={{ discovery_method: 'Transit', disc_year_min: 2000, disc_year_max: 2010 }}
        onSelectYear={vi.fn()}
      />,
    )
    await screen.findByTestId('plotly-chart')

    expect(getDiscoveryTimelineMock).toHaveBeenCalledTimes(1)
    expect(getDiscoveryTimelineMock).toHaveBeenCalledWith(
      {
        discovery_method: 'Transit',
        disc_year_min: 2000,
        disc_year_max: 2010,
        group_by_method: true,
      },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('refetches whenever the queryParams reference changes, even with equal contents (AC 15)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    await screen.findByTestId('plotly-chart')

    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    expect(getDiscoveryTimelineMock).toHaveBeenCalledTimes(2)
  })

  it('shows only the loading status while the initial fetch is pending (AC 16)', () => {
    getDiscoveryTimelineMock.mockReturnValue(new Promise(() => {}))

    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading discovery timeline…')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // Superseded by chart-refetch-fixes AC 17: the previous chart stays mounted.
  it('keeps the previous chart mounted and shows loading while refetching (chart-refetch AC 17)', async () => {
    getDiscoveryTimelineMock
      .mockResolvedValueOnce(response())
      .mockReturnValueOnce(new Promise(() => {}))

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    const chart = await screen.findByTestId('plotly-chart')
    const before = lastChartProps()

    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2001 }} onSelectYear={vi.fn()} />)

    expect(screen.getByTestId('plotly-chart')).toBe(chart)
    expect(lastChartProps().data).toBe(before.data)
    expect(screen.getByRole('status')).toHaveTextContent('Loading discovery timeline…')
  })

  it('replaces the previous chart with the new data in the same chart instance (chart-refetch AC 17)', async () => {
    const newerItems: DiscoveryTimelineItem[] = [{ year: 2020, discovery_method: 'Imaging', count: 9 }]
    getDiscoveryTimelineMock
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response(newerItems))

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    const chart = await screen.findByTestId('plotly-chart')

    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2001 }} onSelectYear={vi.fn()} />)
    await waitFor(() => expect(lastChartProps().data).toEqual(buildTimelineTraces(newerItems)))

    expect(screen.getByTestId('plotly-chart')).toBe(chart)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('uses a separate layout object per component instance (chart-refetch AC 19)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())

    render(
      <>
        <DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />
        <DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />
      </>,
    )
    await waitFor(() => expect(screen.getAllByTestId('plotly-chart')).toHaveLength(2))

    const layouts = new Set(chartProps.mock.calls.map(([props]) => (props as CapturedChartProps).layout))
    expect(layouts.size).toBe(2)
    for (const layout of layouts) {
      expect(layout).toMatchObject({ uirevision: 'discovery-timeline' })
    }
  })

  it('passes traces from buildTimelineTraces, the expected layout and aria label to PlotlyChart (AC 17)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())

    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    const props = lastChartProps()
    expect(props.data).toEqual(buildTimelineTraces(ITEMS))
    expect(props.ariaLabel).toBe('Discovery timeline chart')
    expect(props.layout).toMatchObject({
      barmode: 'stack',
      showlegend: true,
      xaxis: { title: { text: 'Discovery year' }, tickformat: 'd' },
      yaxis: { title: { text: 'Planets' } },
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps the same data and layout objects when re-rendered without a new fetch (AC 17)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())
    const params: ChartFilterQueryParams = { disc_year_min: 2000 }

    const { rerender } = render(
      <DiscoveryTimeline queryParams={params} onSelectYear={vi.fn()} />,
    )
    await screen.findByTestId('plotly-chart')
    const before = lastChartProps()

    rerender(<DiscoveryTimeline queryParams={params} onSelectYear={vi.fn()} />)
    const after = lastChartProps()

    expect(chartProps.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(after.data).toBe(before.data)
    expect(after.layout).toBe(before.layout)
    expect(getDiscoveryTimelineMock).toHaveBeenCalledTimes(1)
  })

  it('shows the empty message without a role or chart when no traces remain (AC 18)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(
      response([{ year: null, discovery_method: 'Transit', count: 3 }]),
    )

    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />)

    const message = await screen.findByText('No discoveries match the current filters.')
    expect(message).not.toHaveAttribute('role')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the empty message for an empty response (AC 18)', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response([]))

    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />)

    expect(
      await screen.findByText('No discoveries match the current filters.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
  })

  it.each([
    [
      'ApiError',
      new ApiError({
        message: 'Invalid year range',
        status: 400,
        statusText: 'Bad Request',
        url: '/api/discoveries/timeline',
      }),
      'Invalid year range',
    ],
    ['Error', new Error('Network down'), 'Network down'],
    ['non-Error value', 'boom', 'Request failed'],
  ])('shows an alert for a %s rejection without the chart (AC 19)', async (_label, error, text) => {
    getDiscoveryTimelineMock.mockRejectedValue(error)

    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('replaces the error with loading on refetch, then shows the new error if it also fails (AC 19)', async () => {
    getDiscoveryTimelineMock.mockRejectedValueOnce(new Error('First failure'))
    const second = createDeferred<DiscoveryTimelineResponse>()
    getDiscoveryTimelineMock.mockReturnValueOnce(second.promise)

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('First failure')

    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2001 }} onSelectYear={vi.fn()} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading discovery timeline…')

    await act(async () => {
      second.reject(new Error('Second failure'))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Second failure')
  })

  it('shows the chart after a failed fetch is followed by a successful one (AC 19)', async () => {
    getDiscoveryTimelineMock
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce(response())

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    await screen.findByRole('alert')

    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2001 }} onSelectYear={vi.fn()} />)

    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('DiscoveryTimeline year selection (AC 20)', () => {
  async function renderReady() {
    getDiscoveryTimelineMock.mockResolvedValue(response())
    const onSelectYear = vi.fn()
    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={onSelectYear} />)
    await screen.findByTestId('plotly-chart')
    return onSelectYear
  }

  it('calls onSelectYear once with the numeric customdata', async () => {
    const onSelectYear = await renderReady()

    clickPoint({ customdata: 2010, x: 1999 })

    expect(onSelectYear).toHaveBeenCalledTimes(1)
    expect(onSelectYear).toHaveBeenCalledWith(2010)
  })

  it.each([
    ['integer string', '2012'],
    ['padded integer string', ' 2012 '],
  ])('accepts an %s customdata', async (_label, customdata) => {
    const onSelectYear = await renderReady()

    clickPoint({ customdata })

    expect(onSelectYear).toHaveBeenCalledTimes(1)
    expect(onSelectYear).toHaveBeenCalledWith(2012)
  })

  it('does not call onSelectYear when customdata is missing and x is invalid', async () => {
    const onSelectYear = await renderReady()

    clickPoint({ customdata: undefined, x: 2010.5 })

    expect(onSelectYear).not.toHaveBeenCalled()
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
  ])('falls back to x when customdata is %s', async (_label, customdata) => {
    const onSelectYear = await renderReady()

    clickPoint({ customdata, x: 2008 })

    expect(onSelectYear).toHaveBeenCalledTimes(1)
    expect(onSelectYear).toHaveBeenCalledWith(2008)
  })

  it.each([
    ['empty string', ''],
    ['whitespace-only string', '   '],
    ['fractional number', 2010.5],
    ['fractional string', '2010.5'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['non-numeric string', 'abc'],
    ['array', [2010]],
    ['object', { year: 2010 }],
    ['boolean', true],
  ])('does not call onSelectYear for a %s customdata', async (_label, customdata) => {
    const onSelectYear = await renderReady()

    clickPoint({ customdata, x: 2010 })

    expect(onSelectYear).not.toHaveBeenCalled()
  })

  it('does not call onSelectYear when both customdata and x are missing', async () => {
    const onSelectYear = await renderReady()

    clickPoint({ customdata: undefined, x: undefined })

    expect(onSelectYear).not.toHaveBeenCalled()
  })
})

describe('DiscoveryTimeline stale responses (AC 21)', () => {
  it('ignores an earlier response that resolves after newer queryParams', async () => {
    const first = createDeferred<DiscoveryTimelineResponse>()
    const second = createDeferred<DiscoveryTimelineResponse>()
    getDiscoveryTimelineMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2010 }} onSelectYear={vi.fn()} />)

    const newerItems: DiscoveryTimelineItem[] = [
      { year: 2015, discovery_method: 'Imaging', count: 4 },
    ]
    await act(async () => {
      second.resolve(response(newerItems))
    })
    await act(async () => {
      first.resolve(response(ITEMS))
    })

    await screen.findByTestId('plotly-chart')
    expect(lastChartProps().data).toEqual(buildTimelineTraces(newerItems))
  })

  it('ignores an earlier error that rejects after newer queryParams', async () => {
    const first = createDeferred<DiscoveryTimelineResponse>()
    getDiscoveryTimelineMock
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(response())

    const { rerender } = render(
      <DiscoveryTimeline queryParams={{ disc_year_min: 2000 }} onSelectYear={vi.fn()} />,
    )
    rerender(<DiscoveryTimeline queryParams={{ disc_year_min: 2010 }} onSelectYear={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    await act(async () => {
      first.reject(new Error('late failure'))
    })

    expect(screen.getByTestId('plotly-chart')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('DiscoveryTimeline chart theme (state polish AC 10)', () => {
  it('passes a themed layout that keeps the timeline keys', async () => {
    getDiscoveryTimelineMock.mockResolvedValue(response())

    render(<DiscoveryTimeline queryParams={EMPTY_PARAMS} onSelectYear={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    expect(lastChartProps().layout).toMatchObject({
      barmode: 'stack',
      showlegend: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#e7ecf3' },
      legend: { orientation: 'h' },
      xaxis: { title: { text: 'Discovery year' }, tickformat: 'd', gridcolor: '#2f3d52' },
      yaxis: { title: { text: 'Planets' }, gridcolor: '#2f3d52' },
    })
  })
})
