import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrbitScatterPlot } from './OrbitScatterPlot'
import type { PlotlyPointClick } from './PlotlyChart'
import { getOrbitScatter } from '../../api/charts'
import { ApiError } from '../../api/client'
import { buildOrbitScatterLayout, buildOrbitScatterTraces } from '../../utils/chart'
import type {
  ChartFilterQueryParams,
  ScatterOrbitRadiusItem,
  ScatterOrbitRadiusResponse,
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
  getOrbitScatter: vi.fn(),
}))

const getOrbitScatterMock = vi.mocked(getOrbitScatter)

const ITEMS: ScatterOrbitRadiusItem[] = [
  {
    id: 1,
    planet_name: '11 Com b',
    host_name: '11 Com',
    discovery_method: 'Radial Velocity',
    discovery_year: 2007,
    orbital_period_days: 326.03,
    radius_earth: 12.1,
    mass_earth: 6165.6,
  },
  {
    id: 2,
    planet_name: 'Kepler-22 b',
    host_name: 'Kepler-22',
    discovery_method: 'Transit',
    discovery_year: 2011,
    orbital_period_days: 289.86,
    radius_earth: 2.4,
    mass_earth: 9.1,
  },
]

function response(items: ScatterOrbitRadiusItem[] = ITEMS): ScatterOrbitRadiusResponse {
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

function controls() {
  return {
    radius: screen.getByRole('radio', { name: 'Radius' }),
    mass: screen.getByRole('radio', { name: 'Mass' }),
    logScale: screen.getByRole('checkbox', { name: 'Log scale' }),
  }
}

const EMPTY_PARAMS: ChartFilterQueryParams = {}

beforeEach(() => {
  chartProps.mockReset()
  getOrbitScatterMock.mockReset()
})

describe('OrbitScatterPlot structure and controls (AC 6-9)', () => {
  it('renders a section named by its "Orbit scatter plot" heading (AC 6)', () => {
    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Orbit scatter plot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Orbit scatter plot' })).toBeInTheDocument()
  })

  it('shows a "Y axis" group with Radius selected by default and Log scale checked (AC 7, 8)', () => {
    getOrbitScatterMock.mockReturnValue(new Promise(() => {}))

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Y axis' })).toBeInTheDocument()
    const { radius, mass, logScale } = controls()
    expect(radius).toBeChecked()
    expect(radius).toHaveAttribute('value', 'radius')
    expect(mass).not.toBeChecked()
    expect(mass).toHaveAttribute('value', 'mass')
    expect(logScale).toBeChecked()
  })

  it('shows the waiting status, disables controls and does not fetch when disabled (AC 9)', () => {
    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Waiting for API connection…')
    expect(getOrbitScatterMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    const { radius, mass, logScale } = controls()
    expect(radius).toBeDisabled()
    expect(mass).toBeDisabled()
    expect(logScale).toBeDisabled()
  })

  it('starts fetching when disabled changes from true to false (AC 9)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())

    const { rerender } = render(
      <OrbitScatterPlot queryParams={EMPTY_PARAMS} disabled onSelectPlanet={vi.fn()} />,
    )
    expect(getOrbitScatterMock).not.toHaveBeenCalled()

    rerender(
      <OrbitScatterPlot queryParams={EMPTY_PARAMS} disabled={false} onSelectPlanet={vi.fn()} />,
    )

    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument()
    expect(getOrbitScatterMock).toHaveBeenCalledTimes(1)
    expect(controls().radius).toBeEnabled()
  })
})

describe('OrbitScatterPlot fetching (AC 10-16)', () => {
  it('fetches with the query params plus y_axis: "radius" by default (AC 10)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())

    render(
      <OrbitScatterPlot
        queryParams={{ discovery_method: 'Transit', disc_year_min: 2000 }}
        onSelectPlanet={vi.fn()}
      />,
    )
    await screen.findByTestId('plotly-chart')

    expect(getOrbitScatterMock).toHaveBeenCalledTimes(1)
    expect(getOrbitScatterMock).toHaveBeenCalledWith({
      discovery_method: 'Transit',
      disc_year_min: 2000,
      y_axis: 'radius',
    })
  })

  it('refetches with y_axis: "mass" when Mass is selected (AC 10)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    await user.click(controls().mass)

    expect(controls().mass).toBeChecked()
    expect(getOrbitScatterMock).toHaveBeenCalledTimes(2)
    expect(getOrbitScatterMock).toHaveBeenLastCalledWith({
      disc_year_min: 2000,
      y_axis: 'mass',
    })
    await screen.findByTestId('plotly-chart')
  })

  it('refetches whenever the queryParams reference changes (AC 10)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())

    const { rerender } = render(
      <OrbitScatterPlot queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    await screen.findByTestId('plotly-chart')

    rerender(<OrbitScatterPlot queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    expect(getOrbitScatterMock).toHaveBeenCalledTimes(2)
  })

  it('toggling Log scale updates only the layout without refetching (AC 11)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')
    const before = lastChartProps()
    expect(before.layout).toEqual(buildOrbitScatterLayout('radius', true))

    await user.click(controls().logScale)

    expect(controls().logScale).not.toBeChecked()
    expect(getOrbitScatterMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('plotly-chart')).toBeInTheDocument()
    const after = lastChartProps()
    expect(after.layout).toEqual(buildOrbitScatterLayout('radius', false))
    expect(after.data).toBe(before.data)
  })

  it('shows only the loading status (no chart) while fetching, keeping controls enabled (AC 12)', () => {
    getOrbitScatterMock.mockReturnValue(new Promise(() => {}))

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading orbit scatter plot…')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('No planets match the current filters.')).not.toBeInTheDocument()
    const { radius, mass, logScale } = controls()
    expect(radius).toBeEnabled()
    expect(mass).toBeEnabled()
    expect(logScale).toBeEnabled()
  })

  it('hides the chart and shows loading while refetching after a Y axis change (AC 12)', async () => {
    getOrbitScatterMock
      .mockResolvedValueOnce(response())
      .mockReturnValueOnce(new Promise(() => {}))
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    await user.click(controls().mass)

    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading orbit scatter plot…')
  })

  it('passes traces and layout for the fetched Y axis and the aria label to PlotlyChart (AC 13)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    let props = lastChartProps()
    expect(props.data).toEqual(buildOrbitScatterTraces(ITEMS, 'radius'))
    expect(props.layout).toEqual(buildOrbitScatterLayout('radius', true))
    expect(props.ariaLabel).toBe('Orbit scatter plot chart')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await user.click(controls().mass)
    await screen.findByTestId('plotly-chart')

    props = lastChartProps()
    expect(props.data).toEqual(buildOrbitScatterTraces(ITEMS, 'mass'))
    expect(props.layout).toEqual(buildOrbitScatterLayout('mass', true))
  })

  it('applies a Log scale change made during loading once the fetch completes (AC 11, 13)', async () => {
    const pending = createDeferred<ScatterOrbitRadiusResponse>()
    getOrbitScatterMock.mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    await user.click(controls().logScale)

    await act(async () => {
      pending.resolve(response())
    })
    await screen.findByTestId('plotly-chart')

    expect(getOrbitScatterMock).toHaveBeenCalledTimes(1)
    expect(lastChartProps().layout).toEqual(buildOrbitScatterLayout('radius', false))
  })

  it('keeps the same data and layout objects when re-rendered without changes (AC 13)', async () => {
    getOrbitScatterMock.mockResolvedValue(response())
    const params: ChartFilterQueryParams = { disc_year_min: 2000 }

    const { rerender } = render(
      <OrbitScatterPlot queryParams={params} onSelectPlanet={vi.fn()} />,
    )
    await screen.findByTestId('plotly-chart')
    const before = lastChartProps()

    rerender(<OrbitScatterPlot queryParams={params} onSelectPlanet={vi.fn()} />)
    const after = lastChartProps()

    expect(chartProps.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(after.data).toBe(before.data)
    expect(after.layout).toBe(before.layout)
    expect(getOrbitScatterMock).toHaveBeenCalledTimes(1)
  })

  it('shows the empty message without a role or chart when no traces remain, keeping controls (AC 14)', async () => {
    getOrbitScatterMock.mockResolvedValue(
      response([{ ...ITEMS[0], orbital_period_days: null }]),
    )

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    const message = await screen.findByText('No planets match the current filters.')
    expect(message).not.toHaveAttribute('role')
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(controls().mass).toBeEnabled()
  })

  it.each([
    [
      'ApiError',
      new ApiError({
        message: 'Invalid y_axis',
        status: 422,
        statusText: 'Unprocessable Entity',
        url: '/api/scatter/orbit-radius',
      }),
      'Invalid y_axis',
    ],
    ['Error', new Error('Network down'), 'Network down'],
    ['non-Error value', 'boom', 'Request failed'],
  ])('shows an alert for a %s rejection without the chart (AC 15)', async (_label, error, text) => {
    getOrbitScatterMock.mockRejectedValue(error)

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(controls().mass).toBeEnabled()
  })

  it('replaces the error with loading on refetch, then shows the new error if it also fails (AC 15)', async () => {
    getOrbitScatterMock.mockRejectedValueOnce(new Error('First failure'))
    const second = createDeferred<ScatterOrbitRadiusResponse>()
    getOrbitScatterMock.mockReturnValueOnce(second.promise)
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('First failure')

    await user.click(controls().mass)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading orbit scatter plot…')

    await act(async () => {
      second.reject(new Error('Second failure'))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Second failure')
  })

  it('ignores an earlier response that resolves after the Y axis changed (AC 16)', async () => {
    const first = createDeferred<ScatterOrbitRadiusResponse>()
    const second = createDeferred<ScatterOrbitRadiusResponse>()
    getOrbitScatterMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const user = userEvent.setup()

    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={vi.fn()} />)
    await user.click(controls().mass)

    const massItems = [ITEMS[1]]
    await act(async () => {
      second.resolve(response(massItems))
    })
    await act(async () => {
      first.resolve(response(ITEMS))
    })

    await screen.findByTestId('plotly-chart')
    expect(lastChartProps().data).toEqual(buildOrbitScatterTraces(massItems, 'mass'))
  })

  it('ignores an earlier error that rejects after newer queryParams (AC 16)', async () => {
    const first = createDeferred<ScatterOrbitRadiusResponse>()
    getOrbitScatterMock
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(response())

    const { rerender } = render(
      <OrbitScatterPlot queryParams={{ disc_year_min: 2000 }} onSelectPlanet={vi.fn()} />,
    )
    rerender(<OrbitScatterPlot queryParams={{ disc_year_min: 2010 }} onSelectPlanet={vi.fn()} />)
    await screen.findByTestId('plotly-chart')

    await act(async () => {
      first.reject(new Error('late failure'))
    })

    expect(screen.getByTestId('plotly-chart')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('OrbitScatterPlot point selection (AC 17)', () => {
  async function renderReady() {
    getOrbitScatterMock.mockResolvedValue(response())
    const onSelectPlanet = vi.fn()
    render(<OrbitScatterPlot queryParams={EMPTY_PARAMS} onSelectPlanet={onSelectPlanet} />)
    await screen.findByTestId('plotly-chart')
    return onSelectPlanet
  }

  it('calls onSelectPlanet once with the planet name from customdata[0]', async () => {
    const onSelectPlanet = await renderReady()

    clickPoint(['Kepler-22 b', 'Kepler-22', '2011', '2.40 R_Earth', '9.10 M_Earth', '289.86 d'])

    expect(onSelectPlanet).toHaveBeenCalledTimes(1)
    expect(onSelectPlanet).toHaveBeenCalledWith('Kepler-22 b')
  })

  it('works with the customdata produced by buildOrbitScatterTraces', async () => {
    const onSelectPlanet = await renderReady()
    const trace = lastChartProps().data[0] as { customdata: unknown[] }

    clickPoint(trace.customdata[0])

    expect(onSelectPlanet).toHaveBeenCalledTimes(1)
    expect(onSelectPlanet).toHaveBeenCalledWith(
      (trace.customdata[0] as string[])[0],
    )
  })

  it.each([
    ['"Not available" name', ['Not available', 'Host', '2000']],
    ['empty name', ['', 'Host']],
    ['whitespace-only name', ['   ', 'Host']],
    ['non-string name', [42, 'Host']],
    ['null name', [null, 'Host']],
    ['empty array', []],
    ['plain string customdata', 'Kepler-22 b'],
    ['undefined customdata', undefined],
    ['null customdata', null],
    ['object customdata', { 0: 'Kepler-22 b' }],
  ])('does not call onSelectPlanet for %s', async (_label, customdata) => {
    const onSelectPlanet = await renderReady()

    clickPoint(customdata)

    expect(onSelectPlanet).not.toHaveBeenCalled()
  })
})
