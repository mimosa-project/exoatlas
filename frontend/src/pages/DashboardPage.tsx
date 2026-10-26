import { useCallback, useEffect, useState } from 'react'
import { getDiscoveryMethods } from '../api/discoveries'
import { getHealth } from '../api/health'
import { getPlanets } from '../api/planets'
import { DiscoveryTimeline } from '../components/charts/DiscoveryTimeline'
import { OrbitScatterPlot } from '../components/charts/OrbitScatterPlot'
import { SkyMap } from '../components/charts/SkyMap'
import { FilterPanel } from '../components/filters/FilterPanel'
import { AppShell } from '../components/layout/AppShell'
import {
  Header,
  type ApiConnectionState,
} from '../components/layout/Header'
import { PlanetDetailDrawer } from '../components/planets/PlanetDetailDrawer'
import { PlanetTable } from '../components/planets/PlanetTable'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { usePlanetFilters } from '../hooks/usePlanetFilters'
import type { PlanetListQueryParams } from '../types/api'
import { toErrorMessage } from '../utils/error'

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
        <ErrorMessage className="kpi-card__error">
          {error}
        </ErrorMessage>
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
    chartQueryParams,
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
  const [selectedPlanetName, setSelectedPlanetName] = useState<string | null>(
    null,
  )
  // Incremented by "Retry connection" to re-run the connection check.
  const [connectionAttempt, setConnectionAttempt] = useState(0)

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
  }, [connectionAttempt])

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

  const retryConnection = useCallback(() => {
    setConnection({ status: 'loading' })
    setKpis({ status: 'idle' })
    setConnectionAttempt((attempt) => attempt + 1)
  }, [])
  const closePlanetDetail = useCallback(() => setSelectedPlanetName(null), [])
  const selectDiscoveryYear = useCallback(
    (year: number) => {
      setFilter('discoveryYearMin', year)
      setFilter('discoveryYearMax', year)
    },
    [setFilter],
  )

  const kpiValues = kpis.status === 'ready' ? kpis.data : null
  const filtersDisabled = connection.status !== 'connected'

  return (
    <AppShell
      header={
        <Header
          connection={connection}
          totalPlanets={datasetTotal}
          onRetry={retryConnection}
        />
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
      drawer={
        selectedPlanetName != null ? (
          <PlanetDetailDrawer
            planetName={selectedPlanetName}
            onClose={closePlanetDetail}
          />
        ) : undefined
      }
    >
      <section className="dashboard__kpis" aria-label="Key metrics">
        {kpis.status === 'loading' && connection.status === 'connected' ? (
          <LoadingState className="dashboard__kpis-loading">Loading metrics…</LoadingState>
        ) : null}
        {kpis.status === 'error' ? (
          <ErrorMessage className="dashboard__kpis-error">
            {kpis.message}
          </ErrorMessage>
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
        <DiscoveryTimeline
          queryParams={chartQueryParams}
          disabled={filtersDisabled}
          onSelectYear={selectDiscoveryYear}
        />
        <OrbitScatterPlot
          queryParams={chartQueryParams}
          disabled={filtersDisabled}
          onSelectPlanet={setSelectedPlanetName}
        />
        <div className="dashboard__split">
          <SkyMap
            queryParams={chartQueryParams}
            disabled={filtersDisabled}
            onSelectPlanet={setSelectedPlanetName}
          />
          <PlanetTable
            queryParams={listQueryParams}
            disabled={filtersDisabled}
            onSelectPlanet={setSelectedPlanetName}
            selectedPlanetName={selectedPlanetName}
          />
        </div>
      </div>
    </AppShell>
  )
}
