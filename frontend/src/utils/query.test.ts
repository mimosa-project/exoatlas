import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANET_FILTERS, toPlanetListQueryParams } from './query'
import type { PaginationState, PlanetTableSort } from '../types/filters'

describe('toPlanetListQueryParams sort/pagination extension (for PlanetTable)', () => {
  it('omits sort and order when no sort argument is given', () => {
    const params = toPlanetListQueryParams(DEFAULT_PLANET_FILTERS)

    expect(params.sort).toBeUndefined()
    expect(params.order).toBeUndefined()
  })

  it('includes sort and order when a PlanetTableSort is given as the 3rd argument', () => {
    const sort: PlanetTableSort = { sort: 'discovery_year', order: 'desc' }

    const params = toPlanetListQueryParams(DEFAULT_PLANET_FILTERS, undefined, sort)

    expect(params.sort).toBe('discovery_year')
    expect(params.order).toBe('desc')
  })

  it('combines pagination and sort together with filter params', () => {
    const pagination: PaginationState = { limit: 50, offset: 50 }
    const sort: PlanetTableSort = { sort: 'radius_earth', order: 'asc' }

    const params = toPlanetListQueryParams(
      { ...DEFAULT_PLANET_FILTERS, discoveryMethod: 'Transit' },
      pagination,
      sort,
    )

    expect(params).toMatchObject({
      discovery_method: 'Transit',
      limit: 50,
      offset: 50,
      sort: 'radius_earth',
      order: 'asc',
    })
  })
})
