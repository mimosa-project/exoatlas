import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetJson } from './client'
import { getOrbitScatter } from './charts'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, apiGetJson: vi.fn() }
})

const apiGetJsonMock = vi.mocked(apiGetJson)

beforeEach(() => {
  apiGetJsonMock.mockReset()
})

describe('getOrbitScatter (AC 1)', () => {
  it('requests /api/scatter/orbit-radius with the query string and returns the response', async () => {
    const response = { items: [] }
    apiGetJsonMock.mockResolvedValue(response)

    const result = await getOrbitScatter({
      discovery_method: 'Transit',
      disc_year_min: 2000,
      disc_year_max: 2010,
      y_axis: 'mass',
    })

    expect(apiGetJsonMock).toHaveBeenCalledTimes(1)
    expect(apiGetJsonMock).toHaveBeenCalledWith(
      '/api/scatter/orbit-radius?discovery_method=Transit&disc_year_min=2000&disc_year_max=2010&y_axis=mass',
    )
    expect(result).toBe(response)
  })

  it('omits the query string when called without params', async () => {
    apiGetJsonMock.mockResolvedValue({ items: [] })

    await getOrbitScatter()

    expect(apiGetJsonMock).toHaveBeenCalledWith('/api/scatter/orbit-radius')
  })

  it('propagates errors from the client', async () => {
    const error = new Error('boom')
    apiGetJsonMock.mockRejectedValue(error)

    await expect(getOrbitScatter({ y_axis: 'radius' })).rejects.toBe(error)
  })
})
