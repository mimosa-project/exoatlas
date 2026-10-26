import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanetDetailDrawer } from './PlanetDetailDrawer'
import { getPlanetDetail } from '../../api/planets'
import { ApiError } from '../../api/client'
import type { PlanetDetail } from '../../types/api'

vi.mock('../../api/planets', () => ({
  getPlanetDetail: vi.fn(),
}))

const getPlanetDetailMock = vi.mocked(getPlanetDetail)

function buildDetail(overrides: Partial<PlanetDetail> = {}): PlanetDetail {
  return {
    id: 1,
    planet_name: '11 Com b',
    host_name: '11 Com',
    discovery_method: 'Radial Velocity',
    discovery_year: 2007,
    orbit: { orbital_period_days: 326.03, semi_major_axis_au: 1.29 },
    planet: {
      radius_earth: 12.1,
      mass_earth: 6165.6,
      density: 19.1,
      equilibrium_temperature: null,
    },
    star: {
      stellar_temperature: 4742,
      stellar_radius: 19,
      stellar_mass: 2.7,
      stellar_spectral_type: 'G8 III',
    },
    position: {
      right_ascension: 185.1787793,
      declination: 17.7932516,
      distance_parsec: 93.1846,
    },
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

function valueFor(region: HTMLElement, label: string): string | null {
  const term = within(region)
    .getAllByText(label, { selector: 'dt' })
    .find((element) => element.textContent === label)
  if (!term) {
    throw new Error(`No <dt> labelled ${label}`)
  }
  const description = term.nextElementSibling
  expect(description?.tagName).toBe('DD')
  return description?.textContent ?? null
}

beforeEach(() => {
  getPlanetDetailMock.mockReset()
})

describe('PlanetDetailDrawer rendering (AC 8-14)', () => {
  it('renders nothing when planetName is null (AC 8)', () => {
    render(<PlanetDetailDrawer planetName={null} onClose={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getPlanetDetailMock).not.toHaveBeenCalled()
  })

  it('renders a non-modal dialog labelled by its heading, using planetName while loading (AC 9, 11)', () => {
    getPlanetDetailMock.mockReturnValue(new Promise(() => {}))

    render(<PlanetDetailDrawer planetName="Kepler-22 b" onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Kepler-22 b' })
    expect(dialog).not.toHaveAttribute('aria-modal')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId!)).toHaveTextContent('Kepler-22 b')
    expect(within(dialog).getByRole('status')).toHaveTextContent('Loading details…')
  })

  it('calls getPlanetDetail once with planetName on mount (AC 10)', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())

    render(<PlanetDetailDrawer planetName="11 Com b" onClose={vi.fn()} />)

    await screen.findByRole('region', { name: 'Orbit' })
    expect(getPlanetDetailMock).toHaveBeenCalledTimes(1)
    expect(getPlanetDetailMock).toHaveBeenCalledWith('11 Com b')
  })

  it('does not refetch when re-rendered with the same planetName and a new onClose (AC 10)', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())

    const { rerender } = render(
      <PlanetDetailDrawer planetName="11 Com b" onClose={vi.fn()} />,
    )
    await screen.findByRole('region', { name: 'Orbit' })
    rerender(<PlanetDetailDrawer planetName="11 Com b" onClose={vi.fn()} />)

    expect(getPlanetDetailMock).toHaveBeenCalledTimes(1)
  })

  it('shows all five sections with formatted values on success (AC 12)', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())

    render(<PlanetDetailDrawer planetName="11 Com b" onClose={vi.fn()} />)

    const basic = await screen.findByRole('region', { name: 'Basic' })
    expect(valueFor(basic, 'Planet')).toBe('11 Com b')
    expect(valueFor(basic, 'Host')).toBe('11 Com')
    expect(valueFor(basic, 'Discovery year')).toBe('2007')
    expect(valueFor(basic, 'Discovery method')).toBe('Radial Velocity')

    const planet = screen.getByRole('region', { name: 'Planet' })
    expect(valueFor(planet, 'Radius')).toBe('12.10 R_Earth')
    expect(valueFor(planet, 'Mass')).toBe('6,165.60 M_Earth')
    expect(valueFor(planet, 'Density')).toBe('19.10 g/cm³')
    expect(valueFor(planet, 'Equilibrium temperature')).toBe('Not available')

    const orbit = screen.getByRole('region', { name: 'Orbit' })
    expect(valueFor(orbit, 'Orbital period')).toBe('326.03 d')
    expect(valueFor(orbit, 'Semi-major axis')).toBe('1.29 AU')

    const star = screen.getByRole('region', { name: 'Star' })
    expect(valueFor(star, 'Temperature')).toBe('4,742 K')
    expect(valueFor(star, 'Radius')).toBe('19.00 R_Sun')
    expect(valueFor(star, 'Mass')).toBe('2.70 M_Sun')
    expect(valueFor(star, 'Spectral type')).toBe('G8 III')

    const position = screen.getByRole('region', { name: 'Position' })
    expect(valueFor(position, 'Right ascension')).toBe('185.1788°')
    expect(valueFor(position, 'Declination')).toBe('17.7933°')
    expect(valueFor(position, 'Distance')).toBe('93.18 pc')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('uses the response planet_name as heading after success, falling back to planetName when null (AC 9)', async () => {
    getPlanetDetailMock.mockResolvedValueOnce(
      buildDetail({ planet_name: 'Canonical b' }),
    )
    const { unmount } = render(
      <PlanetDetailDrawer planetName="alias b" onClose={vi.fn()} />,
    )
    await screen.findByRole('region', { name: 'Orbit' })
    expect(screen.getByRole('dialog', { name: 'Canonical b' })).toBeInTheDocument()
    unmount()

    getPlanetDetailMock.mockResolvedValueOnce(buildDetail({ planet_name: null }))
    render(<PlanetDetailDrawer planetName="alias b" onClose={vi.fn()} />)
    await screen.findByRole('region', { name: 'Orbit' })
    expect(screen.getByRole('dialog', { name: 'alias b' })).toBeInTheDocument()
  })

  it('shows "Not available" for every null value, distinguishing 0 (AC 13)', async () => {
    getPlanetDetailMock.mockResolvedValue({
      id: null,
      planet_name: 'Null b',
      host_name: null,
      discovery_method: null,
      discovery_year: null,
      orbit: { orbital_period_days: null, semi_major_axis_au: 0 },
      planet: {
        radius_earth: null,
        mass_earth: null,
        density: null,
        equilibrium_temperature: 0,
      },
      star: {
        stellar_temperature: null,
        stellar_radius: null,
        stellar_mass: null,
        stellar_spectral_type: null,
      },
      position: { right_ascension: null, declination: 0, distance_parsec: null },
    })

    render(<PlanetDetailDrawer planetName="Null b" onClose={vi.fn()} />)

    const basic = await screen.findByRole('region', { name: 'Basic' })
    expect(valueFor(basic, 'Host')).toBe('Not available')
    expect(valueFor(basic, 'Discovery year')).toBe('Not available')
    expect(valueFor(basic, 'Discovery method')).toBe('Not available')

    const planet = screen.getByRole('region', { name: 'Planet' })
    expect(valueFor(planet, 'Radius')).toBe('Not available')
    expect(valueFor(planet, 'Mass')).toBe('Not available')
    expect(valueFor(planet, 'Density')).toBe('Not available')
    expect(valueFor(planet, 'Equilibrium temperature')).toBe('0 K')

    const orbit = screen.getByRole('region', { name: 'Orbit' })
    expect(valueFor(orbit, 'Orbital period')).toBe('Not available')
    expect(valueFor(orbit, 'Semi-major axis')).toBe('0.00 AU')

    const star = screen.getByRole('region', { name: 'Star' })
    for (const label of ['Temperature', 'Radius', 'Mass', 'Spectral type']) {
      expect(valueFor(star, label)).toBe('Not available')
    }

    const position = screen.getByRole('region', { name: 'Position' })
    expect(valueFor(position, 'Right ascension')).toBe('Not available')
    expect(valueFor(position, 'Declination')).toBe('0.0000°')
    expect(valueFor(position, 'Distance')).toBe('Not available')
  })

  it('shows an ApiError message as an alert inside the drawer, keeping the close button (AC 14)', async () => {
    getPlanetDetailMock.mockRejectedValue(
      new ApiError({
        message: 'Planet not found',
        status: 404,
        statusText: 'Not Found',
        url: '/api/planets/Missing%20b',
      }),
    )

    render(<PlanetDetailDrawer planetName="Missing b" onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Missing b' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Planet not found')
    expect(within(dialog).getByRole('button', { name: 'Close details' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Missing b' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Orbit' })).not.toBeInTheDocument()
  })

  it('shows Error.message, or "Request failed" for non-Error rejections (AC 14)', async () => {
    getPlanetDetailMock.mockRejectedValueOnce(new Error('Network down'))
    const { unmount } = render(
      <PlanetDetailDrawer planetName="X b" onClose={vi.fn()} />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    unmount()

    getPlanetDetailMock.mockRejectedValueOnce('boom')
    render(<PlanetDetailDrawer planetName="X b" onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed')
  })
})

describe('PlanetDetailDrawer open/close behaviour (AC 15-19)', () => {
  it('calls onClose once when the Close details button is clicked (AC 15)', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<PlanetDetailDrawer planetName="11 Com b" onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close details' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose once on Escape, even when focus is outside the drawer (AC 16)', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<PlanetDetailDrawer planetName="11 Com b" onClose={onClose} />)
    await screen.findByRole('region', { name: 'Orbit' })
    act(() => {
      ;(document.activeElement as HTMLElement | null)?.blur()
    })
    expect(document.activeElement).toBe(document.body)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose exactly once on Escape when focus is inside the drawer (AC 16)', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<PlanetDetailDrawer planetName="11 Com b" onClose={onClose} />)
    await screen.findByRole('region', { name: 'Orbit' })
    const closeButton = screen.getByRole('button', { name: 'Close details' })
    act(() => closeButton.focus())
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose on Escape when planetName is null (AC 16)', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<PlanetDetailDrawer planetName={null} onClose={onClose} />)
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('stops listening for Escape after planetName becomes null', async () => {
    getPlanetDetailMock.mockResolvedValue(buildDetail())
    const onClose = vi.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <PlanetDetailDrawer planetName="11 Com b" onClose={onClose} />,
    )
    rerender(<PlanetDetailDrawer planetName={null} onClose={onClose} />)
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses the close button when mounted with a planetName (AC 17)', () => {
    getPlanetDetailMock.mockReturnValue(new Promise(() => {}))

    render(<PlanetDetailDrawer planetName="11 Com b" onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus()
  })

  it('focuses the close button when planetName changes from null to a value (AC 17)', () => {
    getPlanetDetailMock.mockReturnValue(new Promise(() => {}))

    const { rerender } = render(
      <PlanetDetailDrawer planetName={null} onClose={vi.fn()} />,
    )
    rerender(<PlanetDetailDrawer planetName="11 Com b" onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus()
  })

  it('does not move focus when planetName changes from one value to another (AC 17)', () => {
    getPlanetDetailMock.mockReturnValue(new Promise(() => {}))
    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.appendChild(outside)

    const { rerender } = render(
      <PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />,
    )
    try {
      act(() => outside.focus())
      rerender(<PlanetDetailDrawer planetName="B b" onClose={vi.fn()} />)

      expect(outside).toHaveFocus()
    } finally {
      outside.remove()
    }
  })

  it('refetches for a new planetName, hiding previous details and showing loading (AC 18)', async () => {
    getPlanetDetailMock.mockResolvedValueOnce(buildDetail({ planet_name: 'A b' }))
    const second = createDeferred<PlanetDetail>()
    getPlanetDetailMock.mockReturnValueOnce(second.promise)

    const { rerender } = render(
      <PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />,
    )
    await screen.findByRole('region', { name: 'Orbit' })

    rerender(<PlanetDetailDrawer planetName="B b" onClose={vi.fn()} />)

    expect(getPlanetDetailMock).toHaveBeenLastCalledWith('B b')
    expect(screen.queryByRole('region', { name: 'Orbit' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading details…')
    expect(screen.getByRole('dialog', { name: 'B b' })).toBeInTheDocument()

    await act(async () => {
      second.resolve(buildDetail({ planet_name: 'B b', host_name: 'Host B' }))
    })
    const basic = await screen.findByRole('region', { name: 'Basic' })
    expect(valueFor(basic, 'Host')).toBe('Host B')
  })

  it('shows loading, not stale details, when returning to a previous planet mid-fetch (AC 11, 18)', async () => {
    getPlanetDetailMock
      .mockResolvedValueOnce(buildDetail({ planet_name: 'A b' }))
      .mockReturnValueOnce(new Promise(() => {}))
      .mockReturnValueOnce(new Promise(() => {}))

    const { rerender } = render(
      <PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />,
    )
    await screen.findByRole('region', { name: 'Orbit' })

    rerender(<PlanetDetailDrawer planetName="B b" onClose={vi.fn()} />)
    rerender(<PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />)

    expect(getPlanetDetailMock).toHaveBeenCalledTimes(3)
    expect(getPlanetDetailMock).toHaveBeenLastCalledWith('A b')
    expect(screen.queryByRole('region', { name: 'Orbit' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading details…')
  })

  it('clears a previous error when switching to another planet (AC 18)', async () => {
    getPlanetDetailMock.mockRejectedValueOnce(new Error('Not found'))
    getPlanetDetailMock.mockReturnValueOnce(new Promise(() => {}))

    const { rerender } = render(
      <PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />,
    )
    await screen.findByRole('alert')

    rerender(<PlanetDetailDrawer planetName="B b" onClose={vi.fn()} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading details…')
  })

  it('ignores a stale response that resolves after planetName changed (AC 19)', async () => {
    const first = createDeferred<PlanetDetail>()
    const second = createDeferred<PlanetDetail>()
    getPlanetDetailMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const { rerender } = render(
      <PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />,
    )
    rerender(<PlanetDetailDrawer planetName="B b" onClose={vi.fn()} />)

    await act(async () => {
      second.resolve(buildDetail({ planet_name: 'B b', host_name: 'Host B' }))
    })
    await act(async () => {
      first.resolve(buildDetail({ planet_name: 'A b', host_name: 'Host A' }))
    })

    const basic = await screen.findByRole('region', { name: 'Basic' })
    expect(valueFor(basic, 'Host')).toBe('Host B')
    expect(screen.queryByText('Host A')).not.toBeInTheDocument()
  })

  it('ignores a stale error that rejects after planetName changed (AC 19)', async () => {
    const first = createDeferred<PlanetDetail>()
    getPlanetDetailMock
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(buildDetail({ planet_name: 'B b' }))

    const { rerender } = render(
      <PlanetDetailDrawer planetName="A b" onClose={vi.fn()} />,
    )
    rerender(<PlanetDetailDrawer planetName="B b" onClose={vi.fn()} />)
    await screen.findByRole('region', { name: 'Orbit' })

    await act(async () => {
      first.reject(new Error('late failure'))
    })

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Orbit' })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
