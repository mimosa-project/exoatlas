import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header, type ApiConnectionState } from './Header'

describe('Header retry button (state polish AC 14)', () => {
  it('shows "Retry connection" on error and calls onRetry once when clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()

    render(
      <Header
        connection={{ status: 'error', message: 'Failed to fetch' }}
        totalPlanets={null}
        onRetry={onRetry}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Retry connection' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('keeps the button outside the alert so the alert text is only the status', () => {
    render(
      <Header
        connection={{ status: 'error', message: 'Failed to fetch' }}
        totalPlanets={null}
        onRetry={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    const button = screen.getByRole('button', { name: 'Retry connection' })
    expect(alert).not.toContainElement(button)
    expect(alert).toHaveTextContent('API unavailable: Failed to fetch')
  })

  it('does not show the button on error when onRetry is not provided', () => {
    render(
      <Header connection={{ status: 'error', message: 'Failed to fetch' }} totalPlanets={null} />,
    )

    expect(screen.queryByRole('button', { name: 'Retry connection' })).not.toBeInTheDocument()
  })

  it.each<[string, ApiConnectionState]>([
    ['loading', { status: 'loading' }],
    ['connected', { status: 'connected', healthStatus: 'ok' }],
  ])('does not show the button while %s', (_label, connection) => {
    render(<Header connection={connection} totalPlanets={10} onRetry={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Retry connection' })).not.toBeInTheDocument()
  })
})
