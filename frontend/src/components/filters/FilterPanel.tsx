import type { PlanetFilters } from '../../types/filters'
import { hasActiveFilters } from '../../utils/query'
import { MethodSelect } from './MethodSelect'
import { RangeField } from './RangeField'

type FilterPanelProps = {
  filters: PlanetFilters
  discoveryMethods: string[]
  onFilterChange: <K extends keyof PlanetFilters>(
    key: K,
    value: PlanetFilters[K],
  ) => void
  onReset: () => void
  isDebouncingSearch?: boolean
  disabled?: boolean
}

export function FilterPanel({
  filters,
  discoveryMethods,
  onFilterChange,
  onReset,
  isDebouncingSearch = false,
  disabled = false,
}: FilterPanelProps) {
  return (
    <section className="filter-panel" aria-label="Planet filters">
      <div className="filter-panel__header">
        <h2 className="filter-panel__title">Filters</h2>
        <button
          type="button"
          className="filter-panel__reset"
          onClick={onReset}
          disabled={disabled || !hasActiveFilters(filters)}
        >
          Reset
        </button>
      </div>

      <div className="filter-panel__fields">
        <div className="filter-panel__field">
          <label className="filter-panel__label" htmlFor="filter-search">
            Search
          </label>
          <input
            id="filter-search"
            className="filter-panel__input"
            type="search"
            placeholder="Planet or host name"
            value={filters.q}
            disabled={disabled}
            onChange={(event) => onFilterChange('q', event.target.value)}
          />
          {isDebouncingSearch ? (
            <p className="filter-panel__hint" aria-live="polite">
              Updating search…
            </p>
          ) : null}
        </div>

        <MethodSelect
          label="Discovery method"
          value={filters.discoveryMethod}
          options={discoveryMethods}
          disabled={disabled}
          onChange={(value) => onFilterChange('discoveryMethod', value)}
        />

        <RangeField
          label="Discovery year"
          minValue={filters.discoveryYearMin}
          maxValue={filters.discoveryYearMax}
          minInputId="filter-discovery-year-min"
          maxInputId="filter-discovery-year-max"
          step={1}
          disabled={disabled}
          onMinChange={(value) => onFilterChange('discoveryYearMin', value)}
          onMaxChange={(value) => onFilterChange('discoveryYearMax', value)}
        />

        <RangeField
          label="Radius (Earth radii)"
          minValue={filters.radiusMin}
          maxValue={filters.radiusMax}
          minInputId="filter-radius-min"
          maxInputId="filter-radius-max"
          disabled={disabled}
          onMinChange={(value) => onFilterChange('radiusMin', value)}
          onMaxChange={(value) => onFilterChange('radiusMax', value)}
        />

        <RangeField
          label="Mass (Earth masses)"
          minValue={filters.massMin}
          maxValue={filters.massMax}
          minInputId="filter-mass-min"
          maxInputId="filter-mass-max"
          disabled={disabled}
          onMinChange={(value) => onFilterChange('massMin', value)}
          onMaxChange={(value) => onFilterChange('massMax', value)}
        />

        <RangeField
          label="Orbital period (days)"
          minValue={filters.orbitalPeriodMin}
          maxValue={filters.orbitalPeriodMax}
          minInputId="filter-orbital-period-min"
          maxInputId="filter-orbital-period-max"
          disabled={disabled}
          onMinChange={(value) => onFilterChange('orbitalPeriodMin', value)}
          onMaxChange={(value) => onFilterChange('orbitalPeriodMax', value)}
        />

        <label className="filter-panel__toggle">
          <input
            type="checkbox"
            checked={filters.habitableCandidate}
            disabled={disabled}
            onChange={(event) =>
              onFilterChange('habitableCandidate', event.target.checked)
            }
          />
          <span>Habitable candidate (simplified)</span>
        </label>
      </div>
    </section>
  )
}
