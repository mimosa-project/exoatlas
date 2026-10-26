import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useChartData } from './useChartData'
import { ApiError } from '../api/client'

type Params = { year?: number }

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(fetcher: (params: Params, signal: AbortSignal) => Promise<string>, params: Params, disabled = false) {
  return renderHook(
    ({ params: currentParams, disabled: currentDisabled }) =>
      useChartData(fetcher, currentParams, currentDisabled),
    { initialProps: { params, disabled } },
  )
}

describe('useChartData (chart-refetch AC 5-10)', () => {
  it('returns waiting and does not fetch while disabled (AC 5)', () => {
    const fetcher = vi.fn<(params: Params, signal: AbortSignal) => Promise<string>>()

    const { result } = setup(fetcher, {}, true)

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current).toEqual({ status: 'waiting', data: null, errorMessage: null })
  })

  it('fetches once when enabled and returns loading then ready (AC 6-8)', async () => {
    const pending = createDeferred<string>()
    const fetcher = vi.fn<(params: Params, signal: AbortSignal) => Promise<string>>().mockReturnValue(pending.promise)
    const params = { year: 2000 }

    const { result } = setup(fetcher, params)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(params, expect.any(AbortSignal))
    expect(result.current).toEqual({ status: 'loading', data: null, errorMessage: null })

    await act(async () => {
      pending.resolve('first')
    })

    expect(result.current).toEqual({ status: 'ready', data: 'first', errorMessage: null })
  })

  it('starts fetching when disabled changes to false (AC 6)', async () => {
    const fetcher = vi.fn<(params: Params, signal: AbortSignal) => Promise<string>>().mockResolvedValue('data')
    const params = {}

    const { result, rerender } = setup(fetcher, params, true)
    rerender({ params, disabled: false })

    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => {})
    expect(result.current.status).toBe('ready')
  })

  it('refetches only when the params reference changes (AC 6)', async () => {
    const fetcher = vi.fn<(params: Params, signal: AbortSignal) => Promise<string>>().mockResolvedValue('data')
    const params = { year: 1 }

    const { rerender } = setup(fetcher, params)
    await act(async () => {})
    rerender({ params, disabled: false })
    expect(fetcher).toHaveBeenCalledTimes(1)

    rerender({ params: { year: 1 }, disabled: false })
    await act(async () => {})
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps the previous data while refetching (AC 7)', async () => {
    const second = createDeferred<string>()
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(second.promise)

    const { result, rerender } = setup(fetcher, { year: 1 })
    await act(async () => {})
    expect(result.current.data).toBe('first')

    rerender({ params: { year: 2 }, disabled: false })

    expect(result.current).toEqual({ status: 'loading', data: 'first', errorMessage: null })

    await act(async () => {
      second.resolve('second')
    })
    expect(result.current).toEqual({ status: 'ready', data: 'second', errorMessage: null })
  })

  it.each([
    ['an ApiError', new ApiError({ message: 'Bad request', status: 400, statusText: 'Bad Request', url: '/x' }), 'Bad request'],
    ['an Error', new Error('Network down'), 'Network down'],
    ['a non-Error value', 'boom', 'Request failed'],
  ])('returns error with data null for %s (AC 9)', async (_label, error, message) => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(error)

    const { result, rerender } = setup(fetcher, { year: 1 })
    await act(async () => {})
    rerender({ params: { year: 2 }, disabled: false })
    await act(async () => {})

    expect(result.current).toEqual({ status: 'error', data: null, errorMessage: message })
  })

  it('shows loading with null data when refetching after an error (AC 7)', async () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockReturnValueOnce(new Promise(() => {}))

    const { result, rerender } = setup(fetcher, { year: 1 })
    await act(async () => {})
    rerender({ params: { year: 2 }, disabled: false })

    expect(result.current).toEqual({ status: 'loading', data: null, errorMessage: null })
  })

  it('ignores a superseded success and a superseded failure (AC 10)', async () => {
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    const third = createDeferred<string>()
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise)

    const { result, rerender } = setup(fetcher, { year: 1 })
    rerender({ params: { year: 2 }, disabled: false })
    rerender({ params: { year: 3 }, disabled: false })

    await act(async () => {
      third.resolve('latest')
    })
    await act(async () => {
      first.resolve('stale')
      second.reject(new Error('stale failure'))
    })

    expect(result.current).toEqual({ status: 'ready', data: 'latest', errorMessage: null })
  })

  it('switches to waiting, drops data and ignores an in-flight result when disabled again (AC 5)', async () => {
    const second = createDeferred<string>()
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(second.promise)
    const { result, rerender } = setup(fetcher, { year: 1 })
    await act(async () => {})
    rerender({ params: { year: 2 }, disabled: false })

    rerender({ params: { year: 2 }, disabled: true })
    expect(result.current).toEqual({ status: 'waiting', data: null, errorMessage: null })

    await act(async () => {
      second.resolve('late')
    })
    expect(result.current).toEqual({ status: 'waiting', data: null, errorMessage: null })
  })

  it('does not refetch when only the fetcher reference changes (AC 6)', async () => {
    const fetcherA = vi.fn<(params: Params, signal: AbortSignal) => Promise<string>>().mockResolvedValue('a')
    const fetcherB = vi.fn<(params: Params, signal: AbortSignal) => Promise<string>>().mockResolvedValue('b')
    const params = {}
    const { rerender } = renderHook(
      ({ fetcher }) => useChartData(fetcher, params, false),
      { initialProps: { fetcher: fetcherA } },
    )
    await act(async () => {})

    rerender({ fetcher: fetcherB })
    await act(async () => {})

    expect(fetcherA).toHaveBeenCalledTimes(1)
    expect(fetcherB).not.toHaveBeenCalled()
  })
})

describe('useChartData after re-enabling (chart-refetch AC 5)', () => {
  it('starts the next fetch with null data instead of the data from before the waiting period', async () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(new Promise(() => {}))
    const params = { year: 1 }
    const { result, rerender } = setup(fetcher, params)
    await act(async () => {})
    expect(result.current.data).toBe('first')

    rerender({ params, disabled: true })
    rerender({ params, disabled: false })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current).toEqual({ status: 'loading', data: null, errorMessage: null })
  })
})

describe('useChartData aborts superseded requests (review2-fixes AC 11-14)', () => {
  function signalOf(fetcher: { mock: { calls: unknown[][] } }, index: number): AbortSignal {
    return fetcher.mock.calls[index][1] as AbortSignal
  }

  it('passes a fresh, not yet aborted signal to every fetch (AC 11)', async () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockReturnValue(new Promise(() => {}))
    const { rerender } = setup(fetcher, { year: 1 })
    rerender({ params: { year: 2 }, disabled: false })

    expect(signalOf(fetcher, 0)).toBeInstanceOf(AbortSignal)
    expect(signalOf(fetcher, 1)).not.toBe(signalOf(fetcher, 0))
    expect(signalOf(fetcher, 1).aborted).toBe(false)
  })

  it('aborts the previous request when params change (AC 12)', () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockReturnValue(new Promise(() => {}))
    const { rerender } = setup(fetcher, { year: 1 })

    rerender({ params: { year: 2 }, disabled: false })

    expect(signalOf(fetcher, 0).aborted).toBe(true)
    expect(signalOf(fetcher, 1).aborted).toBe(false)
  })

  it('aborts the in-flight request when disabled becomes true (AC 12)', () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockReturnValue(new Promise(() => {}))
    const params = {}
    const { rerender } = setup(fetcher, params)

    rerender({ params, disabled: true })

    expect(signalOf(fetcher, 0).aborted).toBe(true)
  })

  it('aborts the in-flight request on unmount (AC 12)', () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockReturnValue(new Promise(() => {}))
    const { unmount } = setup(fetcher, {})

    unmount()

    expect(signalOf(fetcher, 0).aborted).toBe(true)
  })

  it('ignores the rejection caused by aborting a superseded request (AC 13)', async () => {
    const second = createDeferred<string>()
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(
        (_params, signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('The operation was aborted.', 'AbortError')),
            )
          }),
      )
      .mockReturnValueOnce(second.promise)
    const { result, rerender } = setup(fetcher, { year: 1 })

    rerender({ params: { year: 2 }, disabled: false })
    await act(async () => {})
    expect(result.current).toEqual({ status: 'loading', data: null, errorMessage: null })

    await act(async () => {
      second.resolve('latest')
    })
    expect(result.current).toEqual({ status: 'ready', data: 'latest', errorMessage: null })
  })

  it('keeps a successful result when its signal is aborted by the next fetch (AC 14)', async () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce('done')
      .mockReturnValueOnce(new Promise(() => {}))
    const { result, rerender } = setup(fetcher, { year: 1 })
    await act(async () => {})

    rerender({ params: { year: 2 }, disabled: false })
    await act(async () => {})

    expect(signalOf(fetcher, 0).aborted).toBe(true)
    expect(result.current).toEqual({ status: 'loading', data: 'done', errorMessage: null })
  })

  it('does not report a new error when a failed fetch is aborted by the next fetch (AC 14)', async () => {
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockReturnValueOnce(new Promise(() => {}))
    const { result, rerender } = setup(fetcher, { year: 1 })
    await act(async () => {})
    expect(result.current.status).toBe('error')

    rerender({ params: { year: 2 }, disabled: false })
    await act(async () => {})

    expect(signalOf(fetcher, 0).aborted).toBe(true)
    expect(result.current).toEqual({ status: 'loading', data: null, errorMessage: null })
  })

  it('ignores an ApiError raised by aborting a superseded request (AC 13)', async () => {
    const second = createDeferred<string>()
    const fetcher = vi
      .fn<(params: Params, signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(
        (_params, signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(
                new ApiError({
                  message: 'The operation was aborted.',
                  status: 0,
                  statusText: 'Network Error',
                  url: '/api/sky-map',
                }),
              ),
            )
          }),
      )
      .mockReturnValueOnce(second.promise)
    const { result, rerender } = setup(fetcher, { year: 1 })

    rerender({ params: { year: 2 }, disabled: false })
    await act(async () => {})

    expect(result.current).toEqual({ status: 'loading', data: null, errorMessage: null })
  })
})
