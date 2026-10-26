import { useEffect, useRef, useState } from 'react'
import { toErrorMessage } from '../utils/error'

export type ChartDataStatus = 'waiting' | 'loading' | 'ready' | 'error'

export type ChartDataState<R> = {
  status: ChartDataStatus
  data: R | null
  errorMessage: string | null
}

const WAITING_STATE: ChartDataState<never> = {
  status: 'waiting',
  data: null,
  errorMessage: null,
}

// Fetches chart data whenever `params` changes. While a refetch is in flight
// the previous successful data is kept so the chart can stay on screen.
// Superseded requests are aborted through the signal passed to `fetcher`.
export function useChartData<P, R>(
  fetcher: (params: P, signal: AbortSignal) => Promise<R>,
  params: P,
  disabled: boolean,
): ChartDataState<R> {
  const fetcherRef = useRef(fetcher)
  const [state, setState] = useState<ChartDataState<R>>(() =>
    disabled ? WAITING_STATE : { status: 'loading', data: null, errorMessage: null },
  )

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  useEffect(() => {
    if (disabled) {
      setState(WAITING_STATE)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setState((previous) => ({
      status: 'loading',
      data: previous.status === 'error' ? null : previous.data,
      errorMessage: null,
    }))

    fetcherRef.current(params, controller.signal).then(
      (data) => {
        if (!cancelled) {
          setState({ status: 'ready', data, errorMessage: null })
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', data: null, errorMessage: toErrorMessage(error) })
        }
      },
    )

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [params, disabled])

  return state
}
