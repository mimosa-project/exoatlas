import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FilterPanel } from './FilterPanel'
import { DEFAULT_PLANET_FILTERS } from '../../utils/query'
import type { PlanetFilters } from '../../types/filters'

function renderPanel(
  overrides: Partial<PlanetFilters> = {},
  props: { disabled?: boolean } = {},
) {
  const onFilterChange = vi.fn()
  const onReset = vi.fn()
  render(
    <FilterPanel
      filters={{ ...DEFAULT_PLANET_FILTERS, ...overrides }}
      discoveryMethods={['Transit']}
      onFilterChange={onFilterChange}
      onReset={onReset}
      disabled={props.disabled}
    />,
  )
  return { onFilterChange, onReset }
}

describe('FilterPanel distance range (sky map spec AC 5-7)', () => {
  it('shows a "Distance (pc)" group with Min/Max inputs right after the orbital period range (AC 5)', () => {
    renderPanel()

    const groups = screen.getAllByRole('group')
    const names = groups.map((group) => group.querySelector('legend')?.textContent)
    const periodIndex = names.indexOf('Orbital period (days)')
    expect(periodIndex).toBeGreaterThanOrEqual(0)
    expect(names[periodIndex + 1]).toBe('Distance (pc)')

    const distance = screen.getByRole('group', { name: 'Distance (pc)' })
    const min = within(distance).getByLabelText('Min')
    const max = within(distance).getByLabelText('Max')
    expect(min).toHaveAttribute('id', 'filter-distance-min')
    expect(max).toHaveAttribute('id', 'filter-distance-max')
    expect(min).toHaveAttribute('step', 'any')
    expect(max).toHaveAttribute('step', 'any')
  })

  it('shows the current distance values', () => {
    renderPanel({ distanceMin: 10, distanceMax: 250.5 })

    const distance = screen.getByRole('group', { name: 'Distance (pc)' })
    expect(within(distance).getByLabelText('Min')).toHaveValue(10)
    expect(within(distance).getByLabelText('Max')).toHaveValue(250.5)
  })

  it('calls onFilterChange with distanceMin / distanceMax when the inputs change (AC 6)', () => {
    const { onFilterChange } = renderPanel()
    const distance = screen.getByRole('group', { name: 'Distance (pc)' })

    fireEvent.change(within(distance).getByLabelText('Min'), { target: { value: '12.5' } })
    expect(onFilterChange).toHaveBeenLastCalledWith('distanceMin', 12.5)

    fireEvent.change(within(distance).getByLabelText('Max'), { target: { value: '300' } })
    expect(onFilterChange).toHaveBeenLastCalledWith('distanceMax', 300)
  })

  it('reports null when a distance input is cleared (AC 6)', () => {
    const { onFilterChange } = renderPanel({ distanceMin: 10 })
    const distance = screen.getByRole('group', { name: 'Distance (pc)' })

    fireEvent.change(within(distance).getByLabelText('Min'), { target: { value: '' } })

    expect(onFilterChange).toHaveBeenLastCalledWith('distanceMin', null)
  })

  it('disables the distance inputs when disabled (AC 7)', () => {
    renderPanel({}, { disabled: true })
    const distance = screen.getByRole('group', { name: 'Distance (pc)' })

    expect(within(distance).getByLabelText('Min')).toBeDisabled()
    expect(within(distance).getByLabelText('Max')).toBeDisabled()
  })

  it('enables Reset when only a distance bound is set (AC 4, 7)', () => {
    renderPanel({ distanceMax: 100 })

    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
  })
})
