import { stateMessageClassName, type StateMessageProps } from './stateMessageClassName'

export function ErrorMessage({ children, className, 'data-testid': testId }: StateMessageProps) {
  return (
    <p className={stateMessageClassName('error', className)} role="alert" data-testid={testId}>
      {children}
    </p>
  )
}
