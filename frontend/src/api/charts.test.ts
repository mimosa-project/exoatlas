import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetJson } from './client'
import { getOrbitScatter, getSkyMap } from './charts'

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

describe('getSkyMap (sky map spec AC 8)', () => {
  it('requests /api/sky-map with the query string and returns the response', async () => {
    const response = { items: [] }
    apiGetJsonMock.mockResolvedValue(response)

    const result = await getSkyMap({
      discovery_method: 'Imaging',
      disc_year_min: 2000,
      distance_min: 0,
      distance_max: 100,
    })

    expect(apiGetJsonMock).toHaveBeenCalledTimes(1)
    expect(apiGetJsonMock).toHaveBeenCalledWith(
      '/api/sky-map?discovery_method=Imaging&disc_year_min=2000&distance_min=0&distance_max=100',
    )
    expect(result).toBe(response)
  })

  it('omits the query string when called without params', async () => {
    apiGetJsonMock.mockResolvedValue({ items: [] })

    await getSkyMap()

    expect(apiGetJsonMock).toHaveBeenCalledWith('/api/sky-map')
  })

  it('propagates errors from the client', async () => {
    const error = new Error('boom')
    apiGetJsonMock.mockRejectedValue(error)

    await expect(getSkyMap({})).rejects.toBe(error)
  })
})
