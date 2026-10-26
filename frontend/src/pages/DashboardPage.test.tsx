import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from './DashboardPage'
import type { PlotlyPointClick } from '../components/charts/PlotlyChart'
import { getOrbitScatter, getSkyMap } from '../api/charts'
import { getDiscoveryMethods, getDiscoveryTimeline } from '../api/discoveries'
import { getHealth } from '../api/health'
import { getPlanetDetail, getPlanets } from '../api/planets'
import type {
  PlanetDetail,
  PlanetListItem,
  PlanetListQueryParams,
  PlanetListResponse,
} from '../types/api'

type CapturedChartProps = {
  ariaLabel: string
  onPointClick?: (point: PlotlyPointClick) => void
}

const chartPropsByLabel = vi.hoisted(() => new Map<string, CapturedChartProps>())

vi.mock('../components/charts/PlotlyChart', () => ({
  PlotlyChart: (props: CapturedChartProps) => {
    chartPropsByLabel.set(props.ariaLabel, props)
    return <div data-testid={`chart:${props.ariaLabel}`} />
  },
}))

vi.mock('../api/health', () => ({ getHealth: vi.fn() }))
vi.mock('../api/planets', () => ({ getPlanets: vi.fn(), getPlanetDetail: vi.fn() }))
vi.mock('../api/discoveries', () => ({
  getDiscoveryMethods: vi.fn(),
  getDiscoveryTimeline: vi.fn(),
}))
vi.mock('../api/charts', () => ({ getOrbitScatter: vi.fn(), getSkyMap: vi.fn() }))

const getHealthMock = vi.mocked(getHealth)
const getPlanetsMock = vi.mocked(getPlanets)
const getPlanetDetailMock = vi.mocked(getPlanetDetail)
const getDiscoveryMethodsMock = vi.mocked(getDiscoveryMethods)
const getDiscoveryTimelineMock = vi.mocked(getDiscoveryTimeline)
const getOrbitScatterMock = vi.mocked(getOrbitScatter)
const getSkyMapMock = vi.mocked(getSkyMap)

const DATASET_TOTAL = 120
const FILTERED_TOTAL = 42

function listItem(overrides: Partial<PlanetListItem>): PlanetListItem {
  return {
    id: 1,
    planet_name: 'Kepler-22 b',
    host_name: 'Kepler-22',
    discovery_method: 'Transit',
    discovery_year: 2011,
    orbital_period_days: 289.86,
    radius_earth: 2.4,
    mass_earth: null,
    distance_parsec: 194.7,
    ...overrides,
  }
}

const TABLE_ITEMS: PlanetListItem[] = [
  listItem({ id: 1, planet_name: '11 Com b', host_name: '11 Com', discovery_method: 'Radial Velocity' }),
  listItem({ id: 2, planet_name: 'Kepler-22 b' }),
]

function paged(items: PlanetListItem[], total: number, params: PlanetListQueryParams): PlanetListResponse {
  return { items, total, limit: params.limit ?? 50, offset: params.offset ?? 0 }
}

const FILTER_KEYS = [
  'q',
  'discovery_method',
  'disc_year_min',
  'disc_year_max',
  'radius_min',
  'radius_max',
  'mass_min',
  'mass_max',
  'orbital_period_min',
  'orbital_period_max',
  'distance_min',
  'distance_max',
  'habitable_candidate',
] as const

function hasFilterKeys(params: PlanetListQueryParams): boolean {
  return FILTER_KEYS.some((key) => key in params)
}

// Routes getPlanets by its arguments: table page, KPI oldest/newest, and the
// limit-1 count calls (connection check and "Displayed").
function routeGetPlanets(params: PlanetListQueryParams = {}): Promise<PlanetListResponse> {
  if (params.limit === 50) {
    return Promise.resolve(paged(TABLE_ITEMS, TABLE_ITEMS.length, params))
  }
  if (params.sort === 'discovery_year') {
    const year = params.order === 'asc' ? 1992 : 2023
    return Promise.resolve(paged([listItem({ discovery_year: year })], DATASET_TOTAL, params))
  }
  return Promise.resolve(
    paged([], hasFilterKeys(params) ? FILTERED_TOTAL : DATASET_TOTAL, params),
  )
}

function buildDetail(planetName: string): PlanetDetail {
  return {
    id: 1,
    planet_name: planetName,
    host_name: 'Host',
    discovery_method: 'Transit',
    discovery_year: 2011,
    orbit: { orbital_period_days: 1, semi_major_axis_au: 1 },
    planet: { radius_earth: 1, mass_earth: 1, density: 1, equilibrium_temperature: 1 },
    star: { stellar_temperature: 1, stellar_radius: 1, stellar_mass: 1, stellar_spectral_type: 'G' },
    position: { right_ascension: 1, declination: 1, distance_parsec: 1 },
  }
}

function setUpConnectedApi() {
  getHealthMock.mockResolvedValue({ status: 'ok' })
  getPlanetsMock.mockImplementation(routeGetPlanets)
  getPlanetDetailMock.mockImplementation((name) => Promise.resolve(buildDetail(name)))
  getDiscoveryMethodsMock.mockResolvedValue({
    items: [
      { discovery_method: 'Transit', count: 80 },
      { discovery_method: 'Radial Velocity', count: 40 },
    ],
  })
  getDiscoveryTimelineMock.mockResolvedValue({
    items: [{ year: 2015, discovery_method: 'Transit', count: 3 }],
  })
  getOrbitScatterMock.mockResolvedValue({
    items: [
      {
        id: 2,
        planet_name: 'Kepler-22 b',
        host_name: 'Kepler-22',
        discovery_method: 'Transit',
        discovery_year: 2011,
        orbital_period_days: 289.86,
        radius_earth: 2.4,
        mass_earth: null,
      },
    ],
  })
  getSkyMapMock.mockResolvedValue({
    items: [
      {
        id: 1,
        planet_name: '11 Com b',
        host_name: '11 Com',
        discovery_method: 'Radial Velocity',
        discovery_year: 2007,
        right_ascension: 185.17,
        declination: 17.79,
        distance_parsec: 93.18,
      },
    ],
  })
}

async function renderConnected() {
  render(<DashboardPage />)
  await screen.findByText('API connected (ok)')
  await screen.findByTestId('chart:Discovery timeline chart')
  await screen.findByTestId('chart:Orbit scatter plot chart')
  await screen.findByTestId('chart:Sky map chart')
  await screen.findByText('Kepler-22 b', { selector: 'td' })
}

function clickChartPoint(ariaLabel: string, point: Partial<PlotlyPointClick>) {
  const props = chartPropsByLabel.get(ariaLabel)
  if (!props?.onPointClick) {
    throw new Error(`No onPointClick for ${ariaLabel}`)
  }
  const onPointClick = props.onPointClick
  act(() =>
    onPointClick({ x: undefined, y: 1, customdata: undefined, curveNumber: 0, pointIndex: 0, ...point }),
  )
}

function tableRow(planetName: string): HTMLElement {
  return screen.getByText(planetName, { selector: 'td' }).closest('tr') as HTMLElement
}

function rangeInputs(legend: string) {
  const group = screen.getByRole('group', { name: legend })
  return {
    min: within(group).getByLabelText('Min'),
    max: within(group).getByLabelText('Max'),
  }
}

function tableCallWith(expected: Record<string, unknown>) {
  return expect(getPlanetsMock).toHaveBeenCalledWith(
    expect.objectContaining({ limit: 50, ...expected }),
  )
}

beforeEach(() => {
  chartPropsByLabel.clear()
  for (const mock of [
    getHealthMock,
    getPlanetsMock,
    getPlanetDetailMock,
    getDiscoveryMethodsMock,
    getDiscoveryTimelineMock,
    getOrbitScatterMock,
    getSkyMapMock,
  ]) {
    mock.mockReset()
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DashboardPage initial load (test coverage AC 19-20)', () => {
  it('connects, shows the header and KPIs, and loads every panel (AC 19)', async () => {
    setUpConnectedApi()

    await renderConnected()

    expect(getHealthMock).toHaveBeenCalled()
    expect(getPlanetsMock).toHaveBeenCalledWith({ limit: 1 })
    expect(screen.getByText(`${DATASET_TOTAL} planets in dataset`)).toBeInTheDocument()

    const kpis = screen.getByRole('region', { name: 'Key metrics' })
    expect(await within(kpis).findByText('Total planets')).toBeInTheDocument()
    expect(within(kpis).getByText('Displayed')).toBeInTheDocument()
    expect(within(kpis).getByText('Discovery methods')).toBeInTheDocument()
    expect(within(kpis).getByText('Discovery years')).toBeInTheDocument()
    expect(within(kpis).getByText('2')).toBeInTheDocument()
    expect(within(kpis).getByText('1992–2023')).toBeInTheDocument()
    await waitFor(() =>
      expect(within(kpis).getAllByText(String(DATASET_TOTAL))).toHaveLength(2),
    )

    expect(getDiscoveryTimelineMock).toHaveBeenCalledWith(
      expect.objectContaining({ group_by_method: true }),
    )
    expect(getOrbitScatterMock).toHaveBeenCalledWith(
      expect.objectContaining({ y_axis: 'radius' }),
    )
    expect(getSkyMapMock).toHaveBeenCalled()
    tableCallWith({ offset: 0 })

    const select = screen.getByLabelText('Discovery method')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All methods',
      'Transit',
      'Radial Velocity',
    ])
  })

  it('shows "Loading metrics…" as a status while KPIs load (AC 20)', async () => {
    setUpConnectedApi()
    getDiscoveryMethodsMock.mockReturnValue(new Promise(() => {}))

    render(<DashboardPage />)

    const status = await screen.findByText('Loading metrics…')
    expect(status).toHaveAttribute('role', 'status')
  })
})

describe('DashboardPage connection failure and retry (test coverage AC 21-22)', () => {
  it('shows the error with Retry, keeps panels waiting and does not load data (AC 21)', async () => {
    setUpConnectedApi()
    getHealthMock.mockRejectedValue(new Error('Failed to fetch'))

    render(<DashboardPage />)

    expect(await screen.findByText('API unavailable: Failed to fetch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeInTheDocument()
    expect(screen.getAllByText('Waiting for API connection…')).toHaveLength(4)
    expect(screen.getByLabelText('Search')).toBeDisabled()
    expect(screen.getByLabelText('Discovery method')).toBeDisabled()

    expect(getPlanetsMock).not.toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }))
    expect(getDiscoveryTimelineMock).not.toHaveBeenCalled()
    expect(getOrbitScatterMock).not.toHaveBeenCalled()
    expect(getSkyMapMock).not.toHaveBeenCalled()
    expect(getDiscoveryMethodsMock).not.toHaveBeenCalled()
  })

  it('retries the connection and loads everything on success (AC 22)', async () => {
    setUpConnectedApi()
    getHealthMock.mockRejectedValueOnce(new Error('Failed to fetch'))
    let resolveHealth!: (value: { status: string }) => void
    getHealthMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveHealth = resolve
      }),
    )
    const user = userEvent.setup()

    render(<DashboardPage />)
    await user.click(await screen.findByRole('button', { name: 'Retry connection' }))

    expect(screen.getByText('Connecting…')).toBeInTheDocument()
    expect(screen.queryByText('Loading metrics…')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry connection' })).not.toBeInTheDocument()
    expect(getHealthMock).toHaveBeenCalledTimes(2)
    const limitOneCalls = getPlanetsMock.mock.calls.filter(
      ([params]) => JSON.stringify(params) === JSON.stringify({ limit: 1 }),
    ).length
    expect(limitOneCalls).toBe(2)
    expect(getDiscoveryMethodsMock).not.toHaveBeenCalled()

    await act(async () => {
      resolveHealth({ status: 'ok' })
    })

    expect(await screen.findByText('API connected (ok)')).toBeInTheDocument()
    expect(await screen.findByText('Total planets')).toBeInTheDocument()
    expect(getDiscoveryMethodsMock).toHaveBeenCalled()
    await screen.findByTestId('chart:Discovery timeline chart')
    expect(screen.getByLabelText('Search')).toBeEnabled()
    tableCallWith({ offset: 0 })
  })

  it('shows the new error and Retry again when the retry also fails (AC 22)', async () => {
    setUpConnectedApi()
    getHealthMock
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Still down'))
    const user = userEvent.setup()

    render(<DashboardPage />)
    await user.click(await screen.findByRole('button', { name: 'Retry connection' }))

    expect(await screen.findByText('API unavailable: Still down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeInTheDocument()
  })
})

describe('DashboardPage filter changes (test coverage AC 23-25)', () => {
  it('refetches the list, displayed count and every chart with the selected method (AC 23)', async () => {
    setUpConnectedApi()
    const user = userEvent.setup()
    await renderConnected()

    await user.selectOptions(screen.getByLabelText('Discovery method'), 'Transit')

    await waitFor(() => tableCallWith({ discovery_method: 'Transit' }))
    expect(getPlanetsMock).toHaveBeenCalledWith({ discovery_method: 'Transit', limit: 1 })
    expect(getDiscoveryTimelineMock).toHaveBeenCalledWith(
      expect.objectContaining({ discovery_method: 'Transit', group_by_method: true }),
    )
    expect(getOrbitScatterMock).toHaveBeenCalledWith(
      expect.objectContaining({ discovery_method: 'Transit' }),
    )
    expect(getSkyMapMock).toHaveBeenCalledWith(
      expect.objectContaining({ discovery_method: 'Transit' }),
    )
    const kpis = screen.getByRole('region', { name: 'Key metrics' })
    expect(await within(kpis).findByText(String(FILTERED_TOTAL))).toBeInTheDocument()
  })

  it('passes distance bounds to the list and every chart (AC 24)', async () => {
    setUpConnectedApi()
    await renderConnected()

    const { min, max } = rangeInputs('Distance (pc)')
    fireEvent.change(min, { target: { value: '10' } })
    fireEvent.change(max, { target: { value: '200' } })

    const distance = { distance_min: 10, distance_max: 200 }
    await waitFor(() => tableCallWith(distance))
    expect(getDiscoveryTimelineMock).toHaveBeenCalledWith(expect.objectContaining(distance))
    expect(getOrbitScatterMock).toHaveBeenCalledWith(expect.objectContaining(distance))
    expect(getSkyMapMock).toHaveBeenCalledWith(expect.objectContaining(distance))
  })

  it('debounces the search by 300ms before refetching the list with a trimmed q (AC 25)', async () => {
    setUpConnectedApi()
    await renderConnected()

    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '  kepler ' } })

    expect(screen.getByText('Updating search…')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(getPlanetsMock).not.toHaveBeenCalledWith(expect.objectContaining({ q: 'kepler' }))

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    vi.useRealTimers()

    await waitFor(() => tableCallWith({ q: 'kepler' }))
    expect(screen.queryByText('Updating search…')).not.toBeInTheDocument()
    for (const mock of [getDiscoveryTimelineMock, getOrbitScatterMock, getSkyMapMock]) {
      for (const [params] of mock.mock.calls) {
        expect(params).not.toHaveProperty('q')
      }
    }
  })
})

describe('DashboardPage chart and table interactions (test coverage AC 26-30)', () => {
  it('narrows the year range to a clicked timeline bar (AC 26)', async () => {
    setUpConnectedApi()
    await renderConnected()

    clickChartPoint('Discovery timeline chart', { x: 2015, customdata: 2015 })

    const { min, max } = rangeInputs('Discovery year')
    expect(min).toHaveValue(2015)
    expect(max).toHaveValue(2015)
    const years = { disc_year_min: 2015, disc_year_max: 2015 }
    await waitFor(() => tableCallWith(years))
    expect(getPlanetsMock).toHaveBeenCalledWith({ ...years, limit: 1 })
    expect(getDiscoveryTimelineMock).toHaveBeenCalledWith(
      expect.objectContaining({ ...years, group_by_method: true }),
    )
  })

  it('opens the drawer from a table row with the row highlighted, and closes it (AC 27)', async () => {
    setUpConnectedApi()
    const user = userEvent.setup()
    await renderConnected()

    await user.click(tableRow('Kepler-22 b'))

    expect(getPlanetDetailMock).toHaveBeenCalledWith('Kepler-22 b')
    expect(await screen.findByRole('dialog', { name: 'Kepler-22 b' })).toBeInTheDocument()
    expect(tableRow('Kepler-22 b')).toHaveAttribute('aria-current', 'true')
    expect(tableRow('11 Com b')).not.toHaveAttribute('aria-current')

    await user.click(screen.getByRole('button', { name: 'Close details' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('.app-shell__drawer')).toBeNull()
    expect(tableRow('Kepler-22 b')).not.toHaveAttribute('aria-current')
  })

  it('opens the drawer from a scatter plot point and highlights the table row (AC 28)', async () => {
    setUpConnectedApi()
    await renderConnected()

    clickChartPoint('Orbit scatter plot chart', {
      customdata: ['Kepler-22 b', 'Kepler-22', '2011', '2.40 R_Earth', 'Not available', '289.86 d'],
    })

    expect(await screen.findByRole('dialog', { name: 'Kepler-22 b' })).toBeInTheDocument()
    expect(getPlanetDetailMock).toHaveBeenCalledWith('Kepler-22 b')
    expect(tableRow('Kepler-22 b')).toHaveAttribute('aria-current', 'true')
  })

  it('opens the drawer from a sky map point (AC 29)', async () => {
    setUpConnectedApi()
    await renderConnected()

    clickChartPoint('Sky map chart', {
      customdata: ['11 Com b', '11 Com', '2007', '185.1700°', '17.7900°', '93.18 pc'],
    })

    expect(await screen.findByRole('dialog', { name: '11 Com b' })).toBeInTheDocument()
    expect(getPlanetDetailMock).toHaveBeenCalledWith('11 Com b')
    expect(tableRow('11 Com b')).toHaveAttribute('aria-current', 'true')
  })

  it('closes the drawer with Escape (AC 30)', async () => {
    setUpConnectedApi()
    const user = userEvent.setup()
    await renderConnected()

    await user.click(tableRow('11 Com b'))
    await screen.findByRole('dialog', { name: '11 Com b' })

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(tableRow('11 Com b')).not.toHaveAttribute('aria-current')
  })
})
