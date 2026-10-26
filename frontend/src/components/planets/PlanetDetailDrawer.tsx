import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { getPlanetDetail } from '../../api/planets'
import {
  formatDegrees,
  formatDensity,
  formatDistance,
  formatMass,
  formatOrbitalPeriod,
  formatRadius,
  formatSemiMajorAxis,
  formatStellarMass,
  formatStellarRadius,
  formatTemperature,
  NOT_AVAILABLE_TEXT,
} from '../../utils/format'
import type { PlanetDetail } from '../../types/api'

type PlanetDetailDrawerProps = {
  planetName: string | null
  onClose: () => void
}

type DetailResult =
  | { planetName: string; status: 'ready'; detail: PlanetDetail }
  | { planetName: string; status: 'error'; message: string }

type DetailItem = {
  label: string
  value: string
}

type DetailSection = {
  key: string
  title: string
  items: DetailItem[]
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

function textOrNotAvailable(value: string | null): string {
  return value ?? NOT_AVAILABLE_TEXT
}

function buildSections(detail: PlanetDetail): DetailSection[] {
  return [
    {
      key: 'basic',
      title: 'Basic',
      items: [
        { label: 'Planet', value: textOrNotAvailable(detail.planet_name) },
        { label: 'Host', value: textOrNotAvailable(detail.host_name) },
        {
          label: 'Discovery year',
          value:
            detail.discovery_year != null
              ? String(detail.discovery_year)
              : NOT_AVAILABLE_TEXT,
        },
        {
          label: 'Discovery method',
          value: textOrNotAvailable(detail.discovery_method),
        },
      ],
    },
    {
      key: 'planet',
      title: 'Planet',
      items: [
        { label: 'Radius', value: formatRadius(detail.planet.radius_earth) },
        { label: 'Mass', value: formatMass(detail.planet.mass_earth) },
        { label: 'Density', value: formatDensity(detail.planet.density) },
        {
          label: 'Equilibrium temperature',
          value: formatTemperature(detail.planet.equilibrium_temperature),
        },
      ],
    },
    {
      key: 'orbit',
      title: 'Orbit',
      items: [
        {
          label: 'Orbital period',
          value: formatOrbitalPeriod(detail.orbit.orbital_period_days),
        },
        {
          label: 'Semi-major axis',
          value: formatSemiMajorAxis(detail.orbit.semi_major_axis_au),
        },
      ],
    },
    {
      key: 'star',
      title: 'Star',
      items: [
        {
          label: 'Temperature',
          value: formatTemperature(detail.star.stellar_temperature),
        },
        { label: 'Radius', value: formatStellarRadius(detail.star.stellar_radius) },
        { label: 'Mass', value: formatStellarMass(detail.star.stellar_mass) },
        {
          label: 'Spectral type',
          value: textOrNotAvailable(detail.star.stellar_spectral_type),
        },
      ],
    },
    {
      key: 'position',
      title: 'Position',
      items: [
        {
          label: 'Right ascension',
          value: formatDegrees(detail.position.right_ascension),
        },
        { label: 'Declination', value: formatDegrees(detail.position.declination) },
        { label: 'Distance', value: formatDistance(detail.position.distance_parsec) },
      ],
    },
  ]
}

export function PlanetDetailDrawer({ planetName, onClose }: PlanetDetailDrawerProps) {
  const idPrefix = useId()
  const titleId = `${idPrefix}-title`
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousPlanetNameRef = useRef<string | null>(null)
  const [result, setResult] = useState<DetailResult | null>(null)
  const [resultPlanetName, setResultPlanetName] = useState(planetName)

  // Drop any previous result as soon as the selection changes, so that
  // switching A -> B -> A shows loading instead of A's stale details.
  if (resultPlanetName !== planetName) {
    setResultPlanetName(planetName)
    setResult(null)
  }

  useEffect(() => {
    if (planetName == null) {
      return
    }

    let cancelled = false

    async function load(name: string) {
      try {
        const detail = await getPlanetDetail(name)
        if (!cancelled) {
          setResult({ planetName: name, status: 'ready', detail })
        }
      } catch (error) {
        if (!cancelled) {
          setResult({ planetName: name, status: 'error', message: toErrorMessage(error) })
        }
      }
    }

    void load(planetName)

    return () => {
      cancelled = true
    }
  }, [planetName])

  useEffect(() => {
    const previous = previousPlanetNameRef.current
    previousPlanetNameRef.current = planetName
    if (previous == null && planetName != null) {
      closeButtonRef.current?.focus()
    }
  }, [planetName])

  useEffect(() => {
    if (planetName == null) {
      return
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [planetName, onClose])

  if (planetName == null) {
    return null
  }

  // A result for a previous planetName is treated as still loading.
  const current = result?.planetName === planetName ? result : null
  const title =
    current?.status === 'ready'
      ? (current.detail.planet_name ?? planetName)
      : planetName

  return (
    <div className="planet-drawer" role="dialog" aria-labelledby={titleId}>
      <div className="planet-drawer__header">
        <h2 id={titleId} className="planet-drawer__title">
          {title}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="planet-drawer__close"
          aria-label="Close details"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {current == null ? (
        <p className="planet-drawer__status" role="status" aria-live="polite">
          Loading details…
        </p>
      ) : null}
      {current?.status === 'error' ? (
        <p className="planet-drawer__status planet-drawer__status--error" role="alert">
          {current.message}
        </p>
      ) : null}
      {current?.status === 'ready'
        ? buildSections(current.detail).map((section) => {
            const sectionTitleId = `${idPrefix}-${section.key}`
            return (
              <section
                key={section.key}
                className="planet-drawer__section"
                aria-labelledby={sectionTitleId}
              >
                <h3 id={sectionTitleId} className="planet-drawer__section-title">
                  {section.title}
                </h3>
                <dl className="planet-drawer__list">
                  {section.items.map((item) => (
                    <div key={item.label} className="planet-drawer__item">
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )
          })
        : null}
    </div>
  )
}
