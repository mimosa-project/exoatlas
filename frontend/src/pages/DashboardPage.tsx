import { useEffect, useState } from 'react'
import { getDiscoveryMethods } from '../api/discoveries'
import { ApiError } from '../api/client'
import { getHealth } from '../api/health'
import { getPlanets } from '../api/planets'
import { FilterPanel } from '../components/filters/FilterPanel'
import { AppShell } from '../components/layout/AppShell'
import {
  Header,
  type ApiConnectionState,
} from '../components/layout/Header'
import { usePlanetFilters } from '../hooks/usePlanetFilters'
import type { PlanetListQueryParams } from '../types/api'

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

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

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

function KpiCard({
  label,
  value,
  error,
}: {
  label: string
  value: string
  error?: string
}) {
  return (
    <article className="kpi-card">
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
      {error ? (
        <p className="kpi-card__error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}

export function DashboardPage() {
  const {
    filters,
    setFilter,
    resetFilters,
    listQueryParams,
    isDebouncingSearch,
  } = usePlanetFilters()

  const [connection, setConnection] = useState<ApiConnectionState>({
    status: 'loading',
  })
  const [datasetTotal, setDatasetTotal] = useState<number | null>(null)
  const [discoveryMethods, setDiscoveryMethods] = useState<string[]>([])
  const [kpis, setKpis] = useState<KpiLoadState>({ status: 'idle' })
  const [displayedPlanets, setDisplayedPlanets] = useState<number | null>(null)
  const [displayedLoading, setDisplayedLoading] = useState(false)
  const [displayedError, setDisplayedError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

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

          setDiscoveryMethods(
            methods.items.map((item) => item.discovery_method),
          )
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

  useEffect(() => {
    if (connection.status !== 'connected' || isDebouncingSearch) {
      return
    }

    let cancelled = false

    async function loadDisplayedCount(queryParams: PlanetListQueryParams) {
      setDisplayedLoading(true)
      setDisplayedError(null)

      try {
        const response = await getPlanets({
          ...queryParams,
          limit: 1,
        })

        if (cancelled) {
          return
        }

        setDisplayedPlanets(response.total)
      } catch (error) {
        if (cancelled) {
          return
        }

        setDisplayedError(toErrorMessage(error))
      } finally {
        if (!cancelled) {
          setDisplayedLoading(false)
        }
      }
    }

    void loadDisplayedCount(listQueryParams)

    return () => {
      cancelled = true
    }
  }, [connection.status, isDebouncingSearch, listQueryParams])

  const kpiValues = kpis.status === 'ready' ? kpis.data : null
  const filtersDisabled = connection.status !== 'connected'

  return (
    <AppShell
      header={
        <Header connection={connection} totalPlanets={datasetTotal} />
      }
      sidebar={
        <FilterPanel
          filters={filters}
          discoveryMethods={discoveryMethods}
          onFilterChange={setFilter}
          onReset={resetFilters}
          isDebouncingSearch={isDebouncingSearch}
          disabled={filtersDisabled}
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
              value={
                displayedLoading
                  ? '…'
                  : displayedError
                    ? '—'
                    : displayedPlanets != null
                      ? displayedPlanets.toLocaleString()
                      : '…'
              }
              error={displayedError ?? undefined}
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
