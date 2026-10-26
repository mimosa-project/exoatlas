import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetJson } from './client'
import { getDiscoveryTimeline } from './discoveries'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, apiGetJson: vi.fn() }
})

const apiGetJsonMock = vi.mocked(apiGetJson)

beforeEach(() => {
  apiGetJsonMock.mockReset()
})

describe('getDiscoveryTimeline (AC 1)', () => {
  it('requests /api/discoveries/timeline with the query string and returns the response', async () => {
    const response = {
      items: [{ year: 2009, discovery_method: 'Transit', count: 3 }],
    }
    apiGetJsonMock.mockResolvedValue(response)

    const result = await getDiscoveryTimeline({
      discovery_method: 'Transit',
      disc_year_min: 2000,
      disc_year_max: 2010,
      group_by_method: true,
    })

    expect(apiGetJsonMock).toHaveBeenCalledTimes(1)
    expect(apiGetJsonMock).toHaveBeenCalledWith(
      '/api/discoveries/timeline?discovery_method=Transit&disc_year_min=2000&disc_year_max=2010&group_by_method=true',
    )
    expect(result).toBe(response)
  })

  it('omits the query string when called without params', async () => {
    apiGetJsonMock.mockResolvedValue({ items: [] })

    await getDiscoveryTimeline()

    expect(apiGetJsonMock).toHaveBeenCalledWith('/api/discoveries/timeline')
  })

  it('propagates errors from the client', async () => {
    const error = new Error('boom')
    apiGetJsonMock.mockRejectedValue(error)

    await expect(getDiscoveryTimeline({})).rejects.toBe(error)
  })
})

describe('getDiscoveryTimeline passes the abort signal (review2-fixes AC 15)', () => {
  it('passes options.signal to apiGetJson', async () => {
    apiGetJsonMock.mockResolvedValue({ items: [] })
    const controller = new AbortController()

    await getDiscoveryTimeline({ group_by_method: true }, { signal: controller.signal })

    expect(apiGetJsonMock).toHaveBeenCalledWith(
      '/api/discoveries/timeline?group_by_method=true',
      { signal: controller.signal },
    )
  })
})

describe('getDiscoveryTimeline without a signal (review2-fixes AC 15)', () => {
  it('calls apiGetJson with no second argument when options has no signal', async () => {
    apiGetJsonMock.mockResolvedValue({ items: [] })

    await getDiscoveryTimeline({}, {})

    expect(apiGetJsonMock).toHaveBeenCalledWith('/api/discoveries/timeline')
    expect(apiGetJsonMock.mock.calls[0]).toHaveLength(1)
  })
})
