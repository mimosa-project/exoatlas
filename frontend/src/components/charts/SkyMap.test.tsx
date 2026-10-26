import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { SkyMap } from './SkyMap'
import type { PlotlyPointClick } from './PlotlyChart'
import { getSkyMap } from '../../api/charts'
import { ApiError } from '../../api/client'
import { buildSkyMapLayout, buildSkyMapTraces } from '../../utils/chart'
import type {
  ChartFilterQueryParams,
  SkyMapItem,
  SkyMapResponse,
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

vi.mock('../../api/charts', () => ({
  getSkyMap: vi.fn(),
}))

const getSkyMapMock = vi.mocked(getSkyMap)

const ITEMS: SkyMapItem[] = [
  {
    id: 1,
    planet_name: '11 Com b',
    host_name: '11 Com',
    discovery_method: 'Radial Velocity',
    discovery_year: 2007,
    right_ascension: 185.1787793,
    declination: 17.7932516,
    distance_parsec: 93.1846,
  },
  {
    id: 2,
    planet_name: 'Kepler-22 b',
    host_name: 'Kepler-22',
    discovery_method: 'Transit',
    discovery_year: 2011,
    right_ascension: 285.679421,
    declination: 47.897,
    distance_parsec: 194.697,
  },
]

function response(items: SkyMapItem[] = ITEMS): SkyMapResponse {
  return { items }
}

function lastChartProps(): CapturedChartProps {
  const call = chartProps.mock.calls.at(-1)
  if (!call) {
    throw new Error('PlotlyChart was not rendered')
  }
  return call[0] as CapturedChartProps
}

function clickPoint(customdata: unknown) {
  const point: PlotlyPointClick = {
    x: 1,
    y: 1,
    customdata,
    curveNumber: 0,
    pointIndex: 0,
  }
  act(() => lastChartProps().onPointClick?.(point))
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
  getSkyMapMock.mockReset()
})

describe('SkyMap states (sky map spec AC 14-22)', () => {
  it('renders a section named by its "Sky map" heading (AC 14)', () => {
    render(<SkyMap queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Sky map' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sky map' })).toBeInTheDocument()
  })

  it('shows the waiting status and does not fetch or render the chart when disabled (AC 15)', () => {
    render(<SkyMap queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Waiting for API connection…')
    expect(getSkyMapMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
  })

  it('starts fetching when disabled changes from true to false (AC 15)', async () => {
    getSkyMapMock.mockResolvedValue(response())

    const { rerender } = render(
      <SkyMap queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />,
    )
    expect(getSkyMapMock).not.toHaveBeenCalled()

    rerender(<SkyMap queryParams={EMPTY_PARAMS} disabled={false} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument()
    expect(getSkyMapMock).toHaveBeenCalledTimes(1)
  })

  it('switches to waiting and discards an in-flight result when disabled becomes true (AC 15)', async () => {
    const pending = createDeferred<SkyMapResponse>()
    getSkyMapMock.mockReturnValueOnce(pending.promise)

    const { rerender } = render(
      <SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />,
    )
    rerender(<SkyMap queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Waiting for API connection…')

    await act(async () => {
      pending.resolve(response())
    })

    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for API connection…')
  })

  it('fetches with exactly the query params, including distance (AC 16)', async () => {
    getSkyMapMock.mockResolvedValue(response())
    const params: ChartFilterQueryParams = {
      discovery_method: 'Transit',
      disc_year_min: 2000,
      distance_min: 0,
      distance_max: 500,
    }

    render(<SkyMap queryParams={params} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    expect(getSkyMapMock).toHaveBeenCalledTimes(1)
    expect(getSkyMapMock).toHaveBeenCalledWith(
      {
        discovery_method: 'Transit',
        disc_year_min: 2000,
        distance_min: 0,
        distance_max: 500,
      },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('refetches whenever the queryParams reference changes (AC 16)', async () => {
    getSkyMapMock.mockResolvedValue(response())

    const { rerender } = render(
      <SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    await screen.findByTestId('plotly-chart')

    rerender(<SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    expect(getSkyMapMock).toHaveBeenCalledTimes(2)
  })

  it('shows only the loading status while the initial fetch is pending (AC 17)', () => {
    getSkyMapMock.mockReturnValue(new Promise(() => {}))

    render(<SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading sky map…')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('No planets match the current filters.')).not.toBeInTheDocument()
  })

  // Superseded by chart-refetch-fixes AC 17: the previous chart stays mounted.
  it('keeps the previous chart mounted and shows loading while refetching (chart-refetch AC 17)', async () => {
    getSkyMapMock
      .mockResolvedValueOnce(response())
      .mockReturnValueOnce(new Promise(() => {}))

    const { rerender } = render(
      <SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    const chart = await screen.findByTestId('plotly-chart')
    const before = lastChartProps()

    rerender(<SkyMap queryParams={{ disc_year_min: 2001 }} onSelectPlanet={vi.fn()} />)

    expect(screen.getByTestId('plotly-chart')).toBe(chart)
    expect(lastChartProps().data).toBe(before.data)
    expect(screen.getByRole('status')).toHaveTextContent('Loading sky map…')
  })

  it('shows only loading when refetching after an empty result (chart-refetch AC 17)', async () => {
    getSkyMapMock
      .mockResolvedValueOnce(response([]))
      .mockReturnValueOnce(new Promise(() => {}))

    const { rerender } = render(
      <SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    await screen.findByText('No planets match the current filters.')

    rerender(<SkyMap queryParams={{ disc_year_min: 2001 }} onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading sky map…')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByText('No planets match the current filters.')).not.toBeInTheDocument()
  })

  it('uses a separate layout object per component instance with uirevision (chart-refetch AC 19-20)', async () => {
    getSkyMapMock.mockResolvedValue(response())

    render(
      <>
        <SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />
        <SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />
      </>,
    )
    await waitFor(() => expect(screen.getAllByTestId('plotly-chart')).toHaveLength(2))

    const layouts = new Set(chartProps.mock.calls.map(([props]) => (props as CapturedChartProps).layout))
    expect(layouts.size).toBe(2)
    for (const layout of layouts) {
      expect(layout).toMatchObject({ uirevision: 'sky-map' })
    }
  })

  it('passes traces, layout and aria label to PlotlyChart (AC 18)', async () => {
    getSkyMapMock.mockResolvedValue(response())

    render(<SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    const props = lastChartProps()
    expect(props.data).toEqual(buildSkyMapTraces(ITEMS))
    expect(props.layout).toEqual(buildSkyMapLayout())
    expect(props.ariaLabel).toBe('Sky map chart')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps the same data and layout objects when re-rendered without a new fetch (AC 19)', async () => {
    getSkyMapMock.mockResolvedValue(response())
    const params: ChartFilterQueryParams = { disc_year_min: 2000 }

    const { rerender } = render(<SkyMap queryParams={params} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')
    const before = lastChartProps()

    rerender(<SkyMap queryParams={params} onSelectPlanet={vi.fn()} />)
    const after = lastChartProps()

    expect(after.data).toBe(before.data)
    expect(after.layout).toBe(before.layout)
    expect(getSkyMapMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['an empty response', []],
    ['only items without coordinates', [{ ...ITEMS[0], right_ascension: null }]],
  ])('shows the empty message without a role or chart for %s (AC 20)', async (_label, items) => {
    getSkyMapMock.mockResolvedValue(response(items))

    render(<SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    const message = await screen.findByText('No planets match the current filters.')
    expect(message).not.toHaveAttribute('role')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each([
    [
      'ApiError',
      new ApiError({
        message: 'Invalid distance',
        status: 422,
        statusText: 'Unprocessable Entity',
        url: '/api/sky-map',
      }),
      'Invalid distance',
    ],
    ['Error', new Error('Network down'), 'Network down'],
    ['non-Error value', 'boom', 'Request failed'],
  ])('shows an alert for a %s rejection without the chart (AC 21)', async (_label, error, text) => {
    getSkyMapMock.mockRejectedValue(error)

    render(<SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('replaces the error with loading on refetch, then shows the new error if it also fails (AC 21)', async () => {
    getSkyMapMock.mockRejectedValueOnce(new Error('First failure'))
    const second = createDeferred<SkyMapResponse>()
    getSkyMapMock.mockReturnValueOnce(second.promise)

    const { rerender } = render(
      <SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('First failure')

    rerender(<SkyMap queryParams={{ disc_year_min: 2001 }} onSelectPlanet={vi.fn()} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading sky map…')

    await act(async () => {
      second.reject(new Error('Second failure'))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Second failure')
  })

  it('ignores an earlier response that resolves after newer queryParams (AC 22)', async () => {
    const first = createDeferred<SkyMapResponse>()
    const second = createDeferred<SkyMapResponse>()
    getSkyMapMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { rerender } = render(
      <SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    rerender(<SkyMap queryParams={{ disc_year_min: 2010 }} onSelectPlanet={vi.fn()} />)

    const newerItems = [ITEMS[1]]
    await act(async () => {
      second.resolve(response(newerItems))
    })
    await act(async () => {
      first.resolve(response(ITEMS))
    })

    await screen.findByTestId('plotly-chart')
    expect(lastChartProps().data).toEqual(buildSkyMapTraces(newerItems))
  })

  it('ignores an earlier error that rejects after newer queryParams (AC 22)', async () => {
    const first = createDeferred<SkyMapResponse>()
    getSkyMapMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(response())

    const { rerender } = render(
      <SkyMap queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    rerender(<SkyMap queryParams={{ disc_year_min: 2010 }} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    await act(async () => {
      first.reject(new Error('late failure'))
    })

    expect(screen.getByTestId('plotly-chart')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('SkyMap point selection (sky map spec AC 23)', () => {
  async function renderReady() {
    getSkyMapMock.mockResolvedValue(response())
    const onSelectPlanet = vi.fn()
    render(<SkyMap queryParams={EMPTY_PARAMS} onSelectPlanet={onSelectPlanet} />)
    await screen.findByTestId('plotly-chart')
    return onSelectPlanet
  }

  it('calls onSelectPlanet once with the planet name from customdata[0]', async () => {
    const onSelectPlanet = await renderReady()

    clickPoint(['Kepler-22 b', 'Kepler-22', '2011', '285.6794°', '47.8970°', '194.70 pc'])

    expect(onSelectPlanet).toHaveBeenCalledTimes(1)
    expect(onSelectPlanet).toHaveBeenCalledWith('Kepler-22 b')
  })

  it('works with the customdata produced by buildSkyMapTraces', async () => {
    const onSelectPlanet = await renderReady()
    const trace = lastChartProps().data[0] as { customdata: string[][] }

    clickPoint(trace.customdata[0])

    expect(onSelectPlanet).toHaveBeenCalledTimes(1)
    expect(onSelectPlanet).toHaveBeenCalledWith(trace.customdata[0][0])
  })

  it.each([
    ['"Not available" name', ['Not available', 'Host']],
    ['empty name', ['', 'Host']],
    ['whitespace-only name', ['   ', 'Host']],
    ['non-string name', [42, 'Host']],
    ['empty array', []],
    ['plain string customdata', 'Kepler-22 b'],
    ['undefined customdata', undefined],
    ['null customdata', null],
  ])('does not call onSelectPlanet for %s', async (_label, customdata) => {
    const onSelectPlanet = await renderReady()

    clickPoint(customdata)

    expect(onSelectPlanet).not.toHaveBeenCalled()
  })
})
