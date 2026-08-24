import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanetTable } from './PlanetTable'
import { getPlanets } from '../../api/planets'
import { ApiError } from '../../api/client'
import type { PlanetListItem, PlanetListResponse } from '../../types/api'

vi.mock('../../api/planets', () => ({
  getPlanets: vi.fn(),
}))

const getPlanetsMock = vi.mocked(getPlanets)

const EMPTY_QUERY_PARAMS = {}

function buildItem(overrides: Partial<PlanetListItem> = {}): PlanetListItem {
  return {
    id: 1,
    planet_name: '11 Com b',
    host_name: '11 Com',
    discovery_method: 'Radial Velocity',
    discovery_year: 2007,
    orbital_period_days: 326.03,
    radius_earth: 12.1,
    mass_earth: 6165.6,
    distance_parsec: 93.1846,
    ...overrides,
  }
}

function buildResponse(
  items: PlanetListItem[],
  overrides: Partial<PlanetListResponse> = {},
): PlanetListResponse {
  return {
    items,
    total: items.length,
    limit: 50,
    offset: 0,
    ...overrides,
  }
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

beforeEach(() => {
  getPlanetsMock.mockReset()
})

describe('PlanetTable display (AC 8-14)', () => {
  it('renders the 8 documented columns as sortable column headers', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([buildItem()]))

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    await waitFor(() => expect(getPlanetsMock).toHaveBeenCalled())

    for (const name of [
      'Planet',
      'Host',
      'Method',
      'Year',
      'Period',
      'Radius',
      'Mass',
      'Distance',
    ]) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('renders formatted values for Period/Radius/Mass/Distance, and Year as a plain integer', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([
        buildItem({
          orbital_period_days: 326.03,
          radius_earth: 12.1,
          mass_earth: 6165.6,
          distance_parsec: 93.1846,
          discovery_year: 2007,
        }),
      ]),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByText('326.03 d')).toBeInTheDocument()
    expect(screen.getByText('12.10 R_Earth')).toBeInTheDocument()
    expect(screen.getByText('6,165.60 M_Earth')).toBeInTheDocument()
    expect(screen.getByText('93.18 pc')).toBeInTheDocument()
    expect(screen.getByText('2007')).toBeInTheDocument()
    expect(screen.queryByText('2,007')).not.toBeInTheDocument()
  })

  it('renders "-" for every null field in a row, including Year', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([
        buildItem({
          discovery_method: null,
          discovery_year: null,
          orbital_period_days: null,
          radius_earth: null,
          mass_earth: null,
          distance_parsec: null,
        }),
      ]),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    const row = await screen.findByRole('row', { name: /11 Com b/ })
    expect(within(row).getAllByText('-')).toHaveLength(6)
  })

  it('renders "-" for the Host column when host_name is null', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem({ planet_name: 'Lonely Planet', host_name: null })]),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    const row = await screen.findByRole('row', { name: /Lonely Planet/ })
    expect(within(row).getAllByText('-')).toHaveLength(1)
  })

  it('shows a discernible loading state while the request is in flight, headers still visible', async () => {
    const deferred = createDeferred<PlanetListResponse>()
    getPlanetsMock.mockReturnValue(deferred.promise)

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(screen.getByTestId('planet-table-status-loading')).not.toHaveTextContent('')
    expect(screen.getByRole('columnheader', { name: 'Planet' })).toBeInTheDocument()

    deferred.resolve(buildResponse([buildItem()]))

    await waitFor(() =>
      expect(screen.queryByTestId('planet-table-status-loading')).not.toBeInTheDocument(),
    )
  })

  it('shows an empty state with no data rows, keeping pagination and range visible/functional', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([], { total: 0 }))

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByTestId('planet-table-status-empty')).not.toHaveTextContent('')
    expect(screen.getAllByRole('row')).toHaveLength(1) // header row only, no data rows
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
    expect(screen.getByText(/0 of 0/)).toBeInTheDocument()
  })

  it('shows an empty state (no rows) when paged past the last page, with range/total still reflecting total', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([], { total: 120, limit: 50, offset: 100 }))

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByTestId('planet-table-status-empty')).not.toHaveTextContent('')
    expect(screen.getAllByRole('row')).toHaveLength(1) // header row only, no data rows
    expect(screen.getByText(/120/)).toBeInTheDocument()
  })

  it('shows an error message with role="alert" on fetch failure, headers still visible', async () => {
    getPlanetsMock.mockRejectedValue(
      new ApiError({
        message: 'Request failed with status 500',
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/planets',
      }),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed with status 500')
    expect(screen.getByRole('columnheader', { name: 'Planet' })).toBeInTheDocument()
  })

  it('does not call getPlanets and shows a waiting state while disabled', () => {
    render(
      <PlanetTable queryParams={EMPTY_QUERY_PARAMS} disabled onSelectPlanet={vi.fn()} />,
    )

    expect(getPlanetsMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('planet-table-status-waiting')).not.toHaveTextContent('')
  })
})

describe('PlanetTable pagination (AC 15-21)', () => {
  it('marks the Planet column aria-sort="ascending" on mount, even while disabled', () => {
    render(
      <PlanetTable queryParams={EMPTY_QUERY_PARAMS} disabled onSelectPlanet={vi.fn()} />,
    )

    expect(screen.getByRole('columnheader', { name: 'Planet' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it('performs the initial fetch once enabled, with limit=50, offset=0, sort=planet_name, order=asc, merged with queryParams', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([buildItem()]))

    const { rerender } = render(
      <PlanetTable
        queryParams={{ discovery_method: 'Transit' }}
        disabled
        onSelectPlanet={vi.fn()}
      />,
    )

    expect(getPlanetsMock).not.toHaveBeenCalled()

    rerender(
      <PlanetTable
        queryParams={{ discovery_method: 'Transit' }}
        disabled={false}
        onSelectPlanet={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenCalledWith({
        discovery_method: 'Transit',
        limit: 50,
        offset: 0,
        sort: 'planet_name',
        order: 'asc',
      }),
    )
  })

  it('shows the current range and total (e.g. "1-50 of 120")', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse(Array.from({ length: 50 }, (_, i) => buildItem({ id: i })), {
        total: 120,
        limit: 50,
        offset: 0,
      }),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    expect(await screen.findByText(/1.{1,3}50 of 120/)).toBeInTheDocument()
  })

  it('disables the previous-page action when offset is 0', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem()], { total: 120, limit: 50, offset: 0 }),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    await screen.findByText(/of 120/)
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
  })

  it('disables the next-page action once offset + limit >= total', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem()], { total: 50, limit: 50, offset: 0 }),
    )

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    await screen.findByText(/of 50/)
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
  })

  it('advances offset by limit on next-page, and can move back with previous-page', async () => {
    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem({ id: 1, planet_name: 'Page One Planet' })], {
        total: 120,
        limit: 50,
        offset: 0,
      }),
    )
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)

    await screen.findByText('Page One Planet')

    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem({ id: 2, planet_name: 'Page Two Planet' })], {
        total: 120,
        limit: 50,
        offset: 50,
      }),
    )
    await user.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50, limit: 50 }),
      ),
    )
    await screen.findByText('Page Two Planet')

    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem({ id: 1, planet_name: 'Page One Planet' })], {
        total: 120,
        limit: 50,
        offset: 0,
      }),
    )
    await user.click(screen.getByRole('button', { name: /previous page/i }))

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0, limit: 50 }),
      ),
    )
  })

  it('resets offset to 0 when queryParams changes', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem()], { total: 120, limit: 50, offset: 0 }),
    )
    const user = userEvent.setup()

    const { rerender } = render(
      <PlanetTable queryParams={{ discovery_method: 'Transit' }} onSelectPlanet={vi.fn()} />,
    )
    await screen.findByText(/of 120/)

    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem()], { total: 120, limit: 50, offset: 50 }),
    )
    await user.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50 }),
      ),
    )

    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem()], { total: 5, limit: 50, offset: 0 }),
    )
    rerender(
      <PlanetTable
        queryParams={{ discovery_method: 'Radial Velocity' }}
        onSelectPlanet={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          discovery_method: 'Radial Velocity',
          offset: 0,
        }),
      ),
    )
  })
})

describe('PlanetTable sorting (AC 22-27)', () => {
  it('sorts ascending by the clicked column\'s field on first click', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([buildItem()]))
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)
    await waitFor(() => expect(getPlanetsMock).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Year' }))

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'discovery_year', order: 'asc' }),
      ),
    )
    expect(screen.getByRole('columnheader', { name: 'Year' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it('toggles asc/desc when the already-sorted column is clicked again', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([buildItem()]))
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)
    await waitFor(() => expect(getPlanetsMock).toHaveBeenCalled())

    // Planet column is already the default ascending sort.
    await user.click(screen.getByRole('button', { name: 'Planet' }))

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'planet_name', order: 'desc' }),
      ),
    )
    expect(screen.getByRole('columnheader', { name: 'Planet' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('switches the sorted column and starts from asc when a different column is clicked', async () => {
    getPlanetsMock.mockResolvedValue(buildResponse([buildItem()]))
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)
    await waitFor(() => expect(getPlanetsMock).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Radius' }))
    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'radius_earth', order: 'asc' }),
      ),
    )
    expect(screen.getByRole('columnheader', { name: 'Radius' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: 'Planet' })).not.toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })

  it('resets offset to 0 when the sort column/direction changes', async () => {
    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem()], { total: 120, limit: 50, offset: 0 }),
    )
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)
    await screen.findByText(/of 120/)

    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem()], { total: 120, limit: 50, offset: 50 }),
    )
    await user.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 50 }),
      ),
    )

    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem()], { total: 120, limit: 50, offset: 0 }),
    )
    await user.click(screen.getByRole('button', { name: 'Mass' }))

    await waitFor(() =>
      expect(getPlanetsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'mass_earth', order: 'asc', offset: 0 }),
      ),
    )
  })
})

describe('PlanetTable row selection (AC 28-30)', () => {
  it('calls onSelectPlanet with the planet_name when a row with a name is clicked', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem({ planet_name: 'Kepler-22 b', host_name: 'Kepler-22' })]),
    )
    const onSelectPlanet = vi.fn()
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={onSelectPlanet} />)

    const row = await screen.findByRole('row', { name: /Kepler-22 b/ })
    await user.click(row)

    expect(onSelectPlanet).toHaveBeenCalledTimes(1)
    expect(onSelectPlanet).toHaveBeenCalledWith('Kepler-22 b')
  })

  it('does not call onSelectPlanet when a row with a null planet_name is clicked', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([
        buildItem({ id: 99, planet_name: null, host_name: 'Nameless Host' }),
      ]),
    )
    const onSelectPlanet = vi.fn()
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={onSelectPlanet} />)

    const row = await screen.findByRole('row', { name: /Nameless Host/ })
    expect(within(row).getAllByText('-')).toHaveLength(1) // Planet column shows "-"

    await user.click(row)

    expect(onSelectPlanet).not.toHaveBeenCalled()
  })

  it('calls onSelectPlanet when a row is activated via keyboard (Enter or Space)', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem({ planet_name: 'Kepler-22 b', host_name: 'Kepler-22' })]),
    )
    const onSelectPlanet = vi.fn()
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={onSelectPlanet} />)

    const row = await screen.findByRole('row', { name: /Kepler-22 b/ })
    row.focus()
    await user.keyboard('{Enter}')

    expect(onSelectPlanet).toHaveBeenCalledWith('Kepler-22 b')

    onSelectPlanet.mockClear()
    row.focus()
    await user.keyboard(' ')

    expect(onSelectPlanet).toHaveBeenCalledWith('Kepler-22 b')
  })
})

describe('PlanetTable stale-response guard', () => {
  it('ignores an older in-flight request that resolves after a newer one', async () => {
    const older = createDeferred<PlanetListResponse>()
    const newer = createDeferred<PlanetListResponse>()
    getPlanetsMock.mockImplementationOnce(() => older.promise)
    getPlanetsMock.mockImplementationOnce(() => newer.promise)

    const { rerender } = render(
      <PlanetTable queryParams={{ discovery_method: 'Transit' }} onSelectPlanet={vi.fn()} />,
    )

    rerender(
      <PlanetTable
        queryParams={{ discovery_method: 'Radial Velocity' }}
        onSelectPlanet={vi.fn()}
      />,
    )

    await waitFor(() => expect(getPlanetsMock).toHaveBeenCalledTimes(2))

    // The newer request (triggered by the queryParams change) resolves first...
    newer.resolve(buildResponse([buildItem({ planet_name: 'Newer Result' })]))
    await screen.findByText('Newer Result')

    // ...then the older, now-stale request resolves late and must be ignored.
    older.resolve(buildResponse([buildItem({ planet_name: 'Stale Result' })]))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Stale Result')).not.toBeInTheDocument()
    expect(screen.getByText('Newer Result')).toBeInTheDocument()
  })
})

describe('PlanetTable disabled/error edge cases', () => {
  it('clears previously shown rows and stops fetching once disabled becomes true mid-session', async () => {
    getPlanetsMock.mockResolvedValue(
      buildResponse([buildItem({ planet_name: 'Kepler-22 b' })]),
    )

    const { rerender } = render(
      <PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />,
    )
    await screen.findByText('Kepler-22 b')

    const callCountBeforeDisable = getPlanetsMock.mock.calls.length

    rerender(
      <PlanetTable queryParams={EMPTY_QUERY_PARAMS} disabled onSelectPlanet={vi.fn()} />,
    )

    expect(screen.getByTestId('planet-table-status-waiting')).not.toHaveTextContent('')
    expect(screen.queryByText('Kepler-22 b')).not.toBeInTheDocument()
    expect(getPlanetsMock.mock.calls.length).toBe(callCountBeforeDisable)
  })

  it('clears previously shown rows and shows only the error on a failed refetch, keeping headers', async () => {
    getPlanetsMock.mockResolvedValueOnce(
      buildResponse([buildItem({ planet_name: 'Kepler-22 b' })], {
        total: 120,
        limit: 50,
        offset: 0,
      }),
    )
    const user = userEvent.setup()

    render(<PlanetTable queryParams={EMPTY_QUERY_PARAMS} onSelectPlanet={vi.fn()} />)
    await screen.findByText('Kepler-22 b')

    getPlanetsMock.mockRejectedValueOnce(
      new ApiError({
        message: 'Request failed with status 500',
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/planets',
      }),
    )
    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed with status 500')
    expect(screen.queryByText('Kepler-22 b')).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Planet' })).toBeInTheDocument()
  })
})
