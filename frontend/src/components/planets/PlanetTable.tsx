import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ApiError } from '../../api/client'
import { getPlanets } from '../../api/planets'
import {
  formatDistance,
  formatMass,
  formatOrbitalPeriod,
  formatRadius,
} from '../../utils/format'
import type {
  PlanetListItem,
  PlanetListQueryParams,
  PlanetListResponse,
  PlanetSortField,
  SortOrder,
} from '../../types/api'

const PAGE_SIZE = 50

type PlanetTableProps = {
  queryParams: PlanetListQueryParams
  disabled?: boolean
  onSelectPlanet: (planetName: string) => void
}

type FetchStatus = 'waiting' | 'loading' | 'ready' | 'error'

type Column = {
  key: PlanetSortField
  label: string
}

const COLUMNS: Column[] = [
  { key: 'planet_name', label: 'Planet' },
  { key: 'host_name', label: 'Host' },
  { key: 'discovery_method', label: 'Method' },
  { key: 'discovery_year', label: 'Year' },
  { key: 'orbital_period_days', label: 'Period' },
  { key: 'radius_earth', label: 'Radius' },
  { key: 'mass_earth', label: 'Mass' },
  { key: 'distance_parsec', label: 'Distance' },
]

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

function renderCellContent(column: PlanetSortField, item: PlanetListItem): string {
  switch (column) {
    case 'id':
      return item.id != null ? String(item.id) : '-'
    case 'planet_name':
      return item.planet_name ?? '-'
    case 'host_name':
      return item.host_name ?? '-'
    case 'discovery_method':
      return item.discovery_method ?? '-'
    case 'discovery_year':
      return item.discovery_year != null ? String(item.discovery_year) : '-'
    case 'orbital_period_days':
      return formatOrbitalPeriod(item.orbital_period_days, { missingText: '-' })
    case 'radius_earth':
      return formatRadius(item.radius_earth, { missingText: '-' })
    case 'mass_earth':
      return formatMass(item.mass_earth, { missingText: '-' })
    case 'distance_parsec':
      return formatDistance(item.distance_parsec, { missingText: '-' })
  }
}

function formatRangeText(offset: number, limit: number, total: number): string {
  if (total === 0) {
    return '0 of 0'
  }
  const start = offset + 1
  const end = Math.min(offset + limit, total)
  return `${start}–${end} of ${total}`
}

export function PlanetTable({
  queryParams,
  disabled = false,
  onSelectPlanet,
}: PlanetTableProps) {
  const [offset, setOffset] = useState(0)
  const [sort, setSort] = useState<PlanetSortField>('planet_name')
  const [order, setOrder] = useState<SortOrder>('asc')
  const [status, setStatus] = useState<FetchStatus>(disabled ? 'waiting' : 'loading')
  const [data, setData] = useState<PlanetListResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resetKeyRef = useRef({ queryParams, sort, order })
  if (
    resetKeyRef.current.queryParams !== queryParams ||
    resetKeyRef.current.sort !== sort ||
    resetKeyRef.current.order !== order
  ) {
    resetKeyRef.current = { queryParams, sort, order }
    if (offset !== 0) {
      setOffset(0)
    }
  }

  useEffect(() => {
    if (disabled) {
      setStatus('waiting')
      setData(null)
      setErrorMessage(null)
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)

    async function load() {
      try {
        const response = await getPlanets({
          ...queryParams,
          limit: PAGE_SIZE,
          offset,
          sort,
          order,
        })

        if (cancelled) {
          return
        }

        setData(response)
        setStatus('ready')
      } catch (error) {
        if (cancelled) {
          return
        }

        setData(null)
        setErrorMessage(toErrorMessage(error))
        setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [queryParams, offset, sort, order, disabled])

  function handleSortClick(field: PlanetSortField) {
    if (field === sort) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder('asc')
    }
  }

  function handleRowSelect(planetName: string | null) {
    if (planetName == null) {
      return
    }
    onSelectPlanet(planetName)
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    planetName: string | null,
  ) {
    if (planetName == null) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectPlanet(planetName)
    }
  }

  const total = data?.total ?? 0
  const canGoPrev = offset > 0
  const canGoNext = data != null && offset + PAGE_SIZE < total
  const isEmpty = status === 'ready' && data != null && data.items.length === 0

  return (
    <section className="planet-table" aria-label="Planet list">
      {status === 'waiting' ? (
        <p
          className="planet-table__status"
          data-testid="planet-table-status-waiting"
          role="status"
        >
          Waiting for API connection…
        </p>
      ) : null}
      {status === 'loading' ? (
        <p
          className="planet-table__status"
          data-testid="planet-table-status-loading"
          role="status"
          aria-live="polite"
        >
          Loading planets…
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="planet-table__status planet-table__status--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {isEmpty ? (
        <p
          className="planet-table__status"
          data-testid="planet-table-status-empty"
        >
          No planets match the current filters.
        </p>
      ) : null}

      <div className="planet-table__scroll">
        <table className="planet-table__table">
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const isSorted = column.key === sort
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (order === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                  >
                    <button
                      type="button"
                      className="planet-table__sort-button"
                      disabled={disabled}
                      onClick={() => handleSortClick(column.key)}
                    >
                      {column.label}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {status === 'ready' && data
              ? data.items.map((item, index) => (
                  <tr
                    key={item.id ?? `${item.planet_name ?? 'unknown'}-${index}`}
                    className="planet-table__row"
                    tabIndex={item.planet_name != null ? 0 : undefined}
                    onClick={() => handleRowSelect(item.planet_name)}
                    onKeyDown={(event) => handleRowKeyDown(event, item.planet_name)}
                  >
                    {COLUMNS.map((column) => (
                      <td key={column.key}>{renderCellContent(column.key, item)}</td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="planet-table__footer">
        <button
          type="button"
          disabled={disabled || !canGoPrev}
          onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
        >
          Previous page
        </button>
        <span className="planet-table__range">
          {formatRangeText(offset, PAGE_SIZE, total)}
        </span>
        <button
          type="button"
          disabled={disabled || !canGoNext}
          onClick={() => setOffset((current) => current + PAGE_SIZE)}
        >
          Next page
        </button>
      </div>
    </section>
  )
}
