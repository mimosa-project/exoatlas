import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterPanel } from './FilterPanel'
import { DEFAULT_PLANET_FILTERS } from '../../utils/query'
import type { PlanetFilters } from '../../types/filters'

const METHODS = ['Transit', 'Radial Velocity', 'Imaging']

function renderPanel(
  overrides: Partial<PlanetFilters> = {},
  props: { disabled?: boolean; isDebouncingSearch?: boolean } = {},
) {
  const onFilterChange = vi.fn()
  const onReset = vi.fn()
  render(
    <FilterPanel
      filters={{ ...DEFAULT_PLANET_FILTERS, ...overrides }}
      discoveryMethods={METHODS}
      onFilterChange={onFilterChange}
      onReset={onReset}
      disabled={props.disabled}
      isDebouncingSearch={props.isDebouncingSearch}
    />,
  )
  return { onFilterChange, onReset }
}

function rangeInputs(legend: string) {
  const group = screen.getByRole('group', { name: legend })
  return {
    min: within(group).getByLabelText('Min'),
    max: within(group).getByLabelText('Max'),
  }
}

describe('FilterPanel inputs (test coverage AC 11-14)', () => {
  it('calls onFilterChange("q", text) when typing in Search (AC 11)', () => {
    const { onFilterChange } = renderPanel()

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'kepler' } })

    expect(onFilterChange).toHaveBeenLastCalledWith('q', 'kepler')
  })

  it('lists "All methods" plus every method (AC 12)', () => {
    renderPanel()

    const select = screen.getByLabelText('Discovery method')
    const options = within(select).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['All methods', ...METHODS])
  })

  it('reports the selected method, and null for "All methods" (AC 12)', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderPanel({ discoveryMethod: 'Transit' })

    await user.selectOptions(screen.getByLabelText('Discovery method'), 'Imaging')
    expect(onFilterChange).toHaveBeenLastCalledWith('discoveryMethod', 'Imaging')

    await user.selectOptions(screen.getByLabelText('Discovery method'), 'All methods')
    expect(onFilterChange).toHaveBeenLastCalledWith('discoveryMethod', null)
  })

  it.each([
    ['Discovery year', 'discoveryYearMin', 'discoveryYearMax'],
    ['Radius (Earth radii)', 'radiusMin', 'radiusMax'],
    ['Mass (Earth masses)', 'massMin', 'massMax'],
    ['Orbital period (days)', 'orbitalPeriodMin', 'orbitalPeriodMax'],
  ] as const)('maps the %s range inputs to %s / %s (AC 13)', (legend, minKey, maxKey) => {
    const { onFilterChange } = renderPanel()
    const { min, max } = rangeInputs(legend)

    fireEvent.change(min, { target: { value: '2.5' } })
    expect(onFilterChange).toHaveBeenLastCalledWith(minKey, 2.5)

    fireEvent.change(max, { target: { value: '40' } })
    expect(onFilterChange).toHaveBeenLastCalledWith(maxKey, 40)
  })

  it('reports null when a range input is cleared (AC 13)', () => {
    const { onFilterChange } = renderPanel({ radiusMax: 3 })

    fireEvent.change(rangeInputs('Radius (Earth radii)').max, { target: { value: '' } })

    expect(onFilterChange).toHaveBeenLastCalledWith('radiusMax', null)
  })

  it('toggles habitableCandidate (AC 14)', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderPanel()

    await user.click(screen.getByRole('checkbox', { name: 'Habitable candidate (simplified)' }))

    expect(onFilterChange).toHaveBeenLastCalledWith('habitableCandidate', true)
  })

  it('reports false when unchecking habitableCandidate (AC 14)', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderPanel({ habitableCandidate: true })

    await user.click(screen.getByRole('checkbox', { name: 'Habitable candidate (simplified)' }))

    expect(onFilterChange).toHaveBeenLastCalledWith('habitableCandidate', false)
  })
})

describe('FilterPanel reset, hint, disabled and displayed values (test coverage AC 15-18)', () => {
  it.each<[string, Partial<PlanetFilters>]>([
    ['the defaults', {}],
    ['a whitespace-only search', { q: '   ' }],
  ])('disables Reset for %s (AC 15)', (_label, overrides) => {
    renderPanel(overrides)

    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('enables Reset with an active filter and calls onReset once on click (AC 15)', async () => {
    const user = userEvent.setup()
    const { onReset } = renderPanel({ massMin: 1 })

    const reset = screen.getByRole('button', { name: 'Reset' })
    expect(reset).toBeEnabled()
    await user.click(reset)

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('shows "Updating search…" only while debouncing (AC 16)', () => {
    const { unmount } = render(
      <FilterPanel
        filters={DEFAULT_PLANET_FILTERS}
        discoveryMethods={METHODS}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        isDebouncingSearch
      />,
    )
    expect(screen.getByText('Updating search…')).toBeInTheDocument()
    unmount()

    renderPanel({}, { isDebouncingSearch: false })
    expect(screen.queryByText('Updating search…')).not.toBeInTheDocument()
  })

  it('disables every control when disabled, including Reset with active filters (AC 17)', () => {
    renderPanel({ q: 'kepler', habitableCandidate: true }, { disabled: true })

    expect(screen.getByLabelText('Search')).toBeDisabled()
    expect(screen.getByLabelText('Discovery method')).toBeDisabled()
    for (const legend of [
      'Discovery year',
      'Radius (Earth radii)',
      'Mass (Earth masses)',
      'Orbital period (days)',
      'Distance (pc)',
    ]) {
      const { min, max } = rangeInputs(legend)
      expect(min).toBeDisabled()
      expect(max).toBeDisabled()
    }
    expect(
      screen.getByRole('checkbox', { name: 'Habitable candidate (simplified)' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('reflects the current filter values (AC 18)', () => {
    renderPanel({
      q: 'kepler',
      discoveryMethod: 'Imaging',
      discoveryYearMin: 2001,
      orbitalPeriodMax: 365.25,
      habitableCandidate: true,
    })

    expect(screen.getByLabelText('Search')).toHaveValue('kepler')
    expect(screen.getByLabelText('Discovery method')).toHaveValue('Imaging')
    expect(rangeInputs('Discovery year').min).toHaveValue(2001)
    expect(rangeInputs('Discovery year').max).toHaveValue(null)
    expect(rangeInputs('Orbital period (days)').max).toHaveValue(365.25)
    expect(
      screen.getByRole('checkbox', { name: 'Habitable candidate (simplified)' }),
    ).toBeChecked()
  })

  it('updates the displayed values when filters change (controlled inputs, AC 18)', () => {
    const props = {
      discoveryMethods: METHODS,
      onFilterChange: vi.fn(),
      onReset: vi.fn(),
    }
    const { rerender } = render(<FilterPanel filters={DEFAULT_PLANET_FILTERS} {...props} />)

    rerender(
      <FilterPanel
        filters={{ ...DEFAULT_PLANET_FILTERS, q: 'wasp', discoveryMethod: 'Transit', massMin: 3 }}
        {...props}
      />,
    )

    expect(screen.getByLabelText('Search')).toHaveValue('wasp')
    expect(screen.getByLabelText('Discovery method')).toHaveValue('Transit')
    expect(rangeInputs('Mass (Earth masses)').min).toHaveValue(3)
  })
})
