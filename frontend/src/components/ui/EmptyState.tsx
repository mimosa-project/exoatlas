import { stateMessageClassName, type StateMessageProps } from './stateMessageClassName'

export function EmptyState({ children, className, 'data-testid': testId }: StateMessageProps) {
  return (
    <p className={stateMessageClassName('empty', className)} data-testid={testId}>
      {children}
    </p>
  )
}
