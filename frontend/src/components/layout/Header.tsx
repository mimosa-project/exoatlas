export type ApiConnectionState =
  | { status: 'loading' }
  | { status: 'connected'; healthStatus: string }
  | { status: 'error'; message: string }

type HeaderProps = {
  connection: ApiConnectionState
  totalPlanets: number | null
}

function formatStatus(connection: ApiConnectionState): string {
  switch (connection.status) {
    case 'loading':
      return 'Connecting…'
    case 'connected':
      return `API connected (${connection.healthStatus})`
    case 'error':
      return 'API unavailable'
  }
}

export function Header({ connection, totalPlanets }: HeaderProps) {
  const statusClassName =
    connection.status === 'connected'
      ? 'header__status--success'
      : connection.status === 'error'
        ? 'header__status--error'
        : 'header__status--loading'

  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">ExoAtlas</h1>
        <p className="header__subtitle">NASA Exoplanet Composite</p>
      </div>

      <div className="header__meta">
        <p
          className={`header__status ${statusClassName}`}
          aria-live="polite"
          role={connection.status === 'error' ? 'alert' : undefined}
        >
          {formatStatus(connection)}
          {connection.status === 'error' ? `: ${connection.message}` : null}
        </p>
        {connection.status === 'connected' && totalPlanets != null ? (
          <p className="header__summary">
            {totalPlanets.toLocaleString()} planets in dataset
          </p>
        ) : null}
      </div>
    </header>
  )
}
