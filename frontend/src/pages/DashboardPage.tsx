import { useEffect, useState } from 'react'
import { getDiscoveryMethods } from '../api/discoveries'
import { ApiError } from '../api/client'
import { getHealth } from '../api/health'
import { getPlanets } from '../api/planets'
import { AppShell } from '../components/layout/AppShell'
import {
  Header,
  type ApiConnectionState,
} from '../components/layout/Header'

type DashboardKpis = {
  totalPlanets: number
  displayedPlanets: number
  discoveryMethodCount: number
  discoveryYearRange: string | null
}

type KpiLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardKpis }
  | { status: 'error'; message: string }

function formatDiscoveryYearRange(
  oldestYear: number | null | undefined,
  newestYear: number | null | undefined,
): string | null {
  if (oldestYear == null || newestYear == null) {
    return null
  }

  return `${oldestYear}–${newestYear}`
}

function DashboardPlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="dashboard-panel dashboard-panel--placeholder">
      <h2 className="dashboard-panel__title">{title}</h2>
      <p className="dashboard-panel__description">{description}</p>
    </section>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="kpi-card">
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
    </article>
  )
}

export function DashboardPage() {
  const [connection, setConnection] = useState<ApiConnectionState>({
    status: 'loading',
  })
  const [datasetTotal, setDatasetTotal] = useState<number | null>(null)
  const [kpis, setKpis] = useState<KpiLoadState>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false

    function toErrorMessage(error: unknown): string {
      if (error instanceof ApiError) {
        return error.message
      }
      if (error instanceof Error) {
        return error.message
      }
      return 'Request failed'
    }

    async function loadDashboard() {
      try {
        const [health, planets] = await Promise.all([
          getHealth(),
          getPlanets({ limit: 1 }),
        ])

        if (cancelled) {
          return
        }

        setConnection({
          status: 'connected',
          healthStatus: health.status,
        })
        setDatasetTotal(planets.total)
        setKpis({ status: 'loading' })

        try {
          const [methods, oldest, newest] = await Promise.all([
            getDiscoveryMethods(),
            getPlanets({
              sort: 'discovery_year',
              order: 'asc',
              limit: 1,
            }),
            getPlanets({
              sort: 'discovery_year',
              order: 'desc',
              limit: 1,
            }),
          ])

          if (cancelled) {
            return
          }

          setKpis({
            status: 'ready',
            data: {
              totalPlanets: planets.total,
              displayedPlanets: planets.total,
              discoveryMethodCount: methods.items.length,
              discoveryYearRange: formatDiscoveryYearRange(
                oldest.items[0]?.discovery_year,
                newest.items[0]?.discovery_year,
              ),
            },
          })
        } catch (error) {
          if (cancelled) {
            return
          }

          setKpis({
            status: 'error',
            message: toErrorMessage(error),
          })
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        setConnection({
          status: 'error',
          message: toErrorMessage(error),
        })
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const kpiValues = kpis.status === 'ready' ? kpis.data : null

  return (
    <AppShell
      header={
        <Header connection={connection} totalPlanets={datasetTotal} />
      }
      sidebar={
        <DashboardPlaceholder
          title="Filters"
          description="Filter panel will be implemented in the next step."
        />
      }
    >
      <section className="dashboard__kpis" aria-label="Key metrics">
        {kpis.status === 'loading' && connection.status === 'connected' ? (
          <p className="dashboard__kpis-loading">Loading metrics…</p>
        ) : null}
        {kpis.status === 'error' ? (
          <p className="dashboard__kpis-error" role="alert">
            {kpis.message}
          </p>
        ) : null}
        {kpiValues ? (
          <div className="dashboard__kpi-grid">
            <KpiCard
              label="Total planets"
              value={kpiValues.totalPlanets.toLocaleString()}
            />
            <KpiCard
              label="Displayed"
              value={kpiValues.displayedPlanets.toLocaleString()}
            />
            <KpiCard
              label="Discovery methods"
              value={kpiValues.discoveryMethodCount.toLocaleString()}
            />
            <KpiCard
              label="Discovery years"
              value={kpiValues.discoveryYearRange ?? 'Not available'}
            />
          </div>
        ) : null}
      </section>

      <div className="dashboard__content">
        <DashboardPlaceholder
          title="Discovery timeline"
          description="Stacked bar chart of discoveries by year and method."
        />
        <DashboardPlaceholder
          title="Orbit scatter plot"
          description="Orbital period versus radius or mass."
        />
        <div className="dashboard__split">
          <DashboardPlaceholder
            title="Sky map"
            description="Right ascension and declination distribution."
          />
          <DashboardPlaceholder
            title="Planet table"
            description="Sortable, paginated list of exoplanets."
          />
        </div>
      </div>
    </AppShell>
  )
}
