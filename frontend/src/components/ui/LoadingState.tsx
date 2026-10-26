import { stateMessageClassName, type StateMessageProps } from './stateMessageClassName'

export function LoadingState({ children, className, 'data-testid': testId }: StateMessageProps) {
  return (
    <p className={stateMessageClassName('loading', className)} role="status" data-testid={testId}>
      {children}
    </p>
  )
}
