import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import { ErrorMessage } from './ErrorMessage'
import { LoadingState } from './LoadingState'

describe('LoadingState (state polish AC 3, 6)', () => {
  it('renders the text in a role="status" paragraph with the shared classes', () => {
    render(<LoadingState>Loading things…</LoadingState>)

    const element = screen.getByRole('status')
    expect(element.tagName).toBe('P')
    expect(element).toHaveTextContent('Loading things…')
    expect(element).toHaveClass('state-message', 'state-message--loading')
    expect(element).not.toHaveAttribute('aria-live')
  })

  it('adds className and data-testid when given', () => {
    render(
      <LoadingState className="panel__status" data-testid="panel-loading">
        Loading…
      </LoadingState>,
    )

    const element = screen.getByTestId('panel-loading')
    expect(element).toHaveClass('state-message', 'state-message--loading', 'panel__status')
    expect(element).toHaveAttribute('role', 'status')
  })
})

describe('EmptyState (state polish AC 4, 6)', () => {
  it('renders the text in a paragraph without a role', () => {
    render(<EmptyState>Nothing here.</EmptyState>)

    const element = screen.getByText('Nothing here.')
    expect(element.tagName).toBe('P')
    expect(element).not.toHaveAttribute('role')
    expect(element).toHaveClass('state-message', 'state-message--empty')
  })

  it('adds className and data-testid when given', () => {
    render(
      <EmptyState className="panel__status" data-testid="panel-empty">
        Nothing here.
      </EmptyState>,
    )

    const element = screen.getByTestId('panel-empty')
    expect(element).toHaveClass('state-message', 'state-message--empty', 'panel__status')
    expect(element).toHaveTextContent('Nothing here.')
  })
})

describe('ErrorMessage (state polish AC 5, 6)', () => {
  it('renders the text in a role="alert" paragraph with the shared classes', () => {
    render(<ErrorMessage>Request failed</ErrorMessage>)

    const element = screen.getByRole('alert')
    expect(element.tagName).toBe('P')
    expect(element).toHaveTextContent('Request failed')
    expect(element).toHaveClass('state-message', 'state-message--error')
  })

  it('adds className and data-testid when given', () => {
    render(
      <ErrorMessage className="panel__status--error" data-testid="panel-error">
        Oops
      </ErrorMessage>,
    )

    const element = screen.getByTestId('panel-error')
    expect(element).toHaveClass('state-message', 'state-message--error', 'panel__status--error')
    expect(element).toHaveAttribute('role', 'alert')
  })

  it('does not add a stray "undefined" class when className is omitted', () => {
    render(<ErrorMessage>Oops</ErrorMessage>)

    expect(screen.getByRole('alert').className).not.toContain('undefined')
  })
})
