import { useEffect, useState } from 'react'
import { ApiError } from './api/client'
import { getHealth } from './api/health'
import { getPlanets } from './api/planets'
import './styles/global.css'

type ConnectionStatus =
  | { state: 'loading' }
  | { state: 'connected'; healthStatus: string; planetTotal: number }
  | { state: 'error'; message: string }

function App() {
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function verifyConnection() {
      try {
        const [health, planets] = await Promise.all([
          getHealth(),
          getPlanets({ limit: 1 }),
        ])

        if (cancelled) {
          return
        }

        setStatus({
          state: 'connected',
          healthStatus: health.status,
          planetTotal: planets.total,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Connection failed'

        setStatus({ state: 'error', message })
      }
    }

    void verifyConnection()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <h1>ExoAtlas</h1>
      <p className="app__tagline">
        Interactive visualization for NASA exoplanet datasets.
      </p>
      {status.state === 'loading' && (
        <p className="app__status app__status--loading">Connecting to API…</p>
      )}
      {status.state === 'connected' && (
        <p className="app__status app__status--success">
          API connected ({status.healthStatus}) ·{' '}
          {status.planetTotal.toLocaleString()} planets
        </p>
      )}
      {status.state === 'error' && (
        <p className="app__status app__status--error" role="alert">
          {status.message}
        </p>
      )}
    </main>
  )
}

export default App
