import type { ReactNode } from 'react'

export type StateMessageProps = {
  children: ReactNode
  className?: string
  'data-testid'?: string
}

export function stateMessageClassName(
  variant: 'loading' | 'empty' | 'error',
  className?: string,
): string {
  const base = `state-message state-message--${variant}`
  return className ? `${base} ${className}` : base
}
