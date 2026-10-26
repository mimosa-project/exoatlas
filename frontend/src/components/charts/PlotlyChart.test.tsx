import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PlotlyChart } from './PlotlyChart'

type PlotlyEventHandler = (event: unknown) => void

type FakeGraphElement = HTMLElement & {
  on?: (eventName: string, handler: PlotlyEventHandler) => void
  removeAllListeners?: (eventName?: string) => void
}

const plotly = vi.hoisted(() => ({
  react: vi.fn(),
  purge: vi.fn(),
}))

vi.mock('plotly.js-dist-min', () => ({ default: plotly }))

// Handlers registered per element via the `on` method that Plotly adds.
const handlersByElement = new Map<HTMLElement, Map<string, PlotlyEventHandler[]>>()

function attachOn(element: FakeGraphElement) {
  if (element.on) {
    return
  }
  const handlers = new Map<string, PlotlyEventHandler[]>()
  handlersByElement.set(element, handlers)
  element.on = vi.fn((eventName: string, handler: PlotlyEventHandler) => {
    handlers.set(eventName, [...(handlers.get(eventName) ?? []), handler])
  })
  element.removeAllListeners = vi.fn((eventName?: string) => {
    if (eventName == null) {
      handlers.clear()
    } else {
      handlers.delete(eventName)
    }
  })
}

function defaultReact(element: FakeGraphElement) {
  attachOn(element)
  return Promise.resolve(element)
}

function graphElement(): FakeGraphElement {
  const call = plotly.react.mock.calls.at(-1)
  if (!call) {
    throw new Error('Plotly.react was not called')
  }
  return call[0] as FakeGraphElement
}

function emitClick(element: HTMLElement, event: unknown) {
  const handlers = handlersByElement.get(element)?.get('plotly_click') ?? []
  for (const handler of handlers) {
    handler(event)
  }
}

function clickHandlerCount(element: HTMLElement): number {
  return handlersByElement.get(element)?.get('plotly_click')?.length ?? 0
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const DATA = [{ type: 'bar' as const, x: [2000], y: [1] }]
const LAYOUT = { barmode: 'stack' as const }

const CLICK_EVENT = {
  points: [
    { x: 2001, y: 4, customdata: 2001, curveNumber: 1, pointIndex: 2 },
    { x: 1999, y: 9, customdata: 1999, curveNumber: 0, pointIndex: 0 },
  ],
}

beforeEach(() => {
  plotly.react.mockReset()
  plotly.purge.mockReset()
  plotly.react.mockImplementation(defaultReact)
  handlersByElement.clear()
})

describe('PlotlyChart rendering (AC 7-9)', () => {
  it('renders a wrapper with role="img" and the given aria-label (AC 7)', () => {
    render(<PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />)

    expect(screen.getByRole('img', { name: 'Test chart' })).toBeInTheDocument()
  })

  it('calls Plotly.react once after the dynamic import, with data, layout and config (AC 8)', async () => {
    render(<PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    expect(plotly.react).toHaveBeenCalledTimes(1)
    const [element, data, layout, config] = plotly.react.mock.calls[0]
    const wrapper = screen.getByRole('img', { name: 'Test chart' })
    expect(element === wrapper || wrapper.contains(element as Node)).toBe(true)
    expect(data).toBe(DATA)
    expect(layout).toBe(LAYOUT)
    expect(config).toEqual(
      expect.objectContaining({ responsive: true, displayModeBar: false }),
    )
  })

  it('calls Plotly.react again on the same element when data or layout references change (AC 9)', async () => {
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()
    const firstElement = graphElement()

    const nextData = [{ type: 'bar' as const, x: [2001], y: [2] }]
    rerender(<PlotlyChart data={nextData} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    expect(plotly.react).toHaveBeenCalledTimes(2)
    expect(plotly.react.mock.calls[1][0]).toBe(firstElement)
    expect(plotly.react.mock.calls[1][1]).toBe(nextData)

    const nextLayout = { barmode: 'group' as const }
    rerender(<PlotlyChart data={nextData} layout={nextLayout} ariaLabel="Test chart" />)
    await flush()

    expect(plotly.react).toHaveBeenCalledTimes(3)
    expect(plotly.react.mock.calls[2][0]).toBe(firstElement)
    expect(plotly.react.mock.calls[2][2]).toBe(nextLayout)
  })

  it('does not call Plotly.react again when re-rendered with the same data and layout objects (AC 9)', async () => {
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()

    rerender(<PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />)
    rerender(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" onPointClick={vi.fn()} />,
    )
    await flush()

    expect(plotly.react).toHaveBeenCalledTimes(1)
  })

  it('calls Plotly.react only once with the latest props when they change before the import completes (AC 9)', async () => {
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    const latestData = [{ type: 'bar' as const, x: [2005], y: [5] }]
    const latestLayout = { barmode: 'group' as const }
    rerender(
      <PlotlyChart data={latestData} layout={latestLayout} ariaLabel="Test chart" />,
    )
    await flush()

    expect(plotly.react).toHaveBeenCalledTimes(1)
    expect(plotly.react.mock.calls[0][1]).toBe(latestData)
    expect(plotly.react.mock.calls[0][2]).toBe(latestLayout)
  })
})

describe('PlotlyChart click handling (AC 10-11)', () => {
  it('calls onPointClick once with the first point of a plotly_click event (AC 10)', async () => {
    const onPointClick = vi.fn()
    render(
      <PlotlyChart
        data={DATA}
        layout={LAYOUT}
        ariaLabel="Test chart"
        onPointClick={onPointClick}
      />,
    )
    await flush()

    act(() => emitClick(graphElement(), CLICK_EVENT))

    expect(onPointClick).toHaveBeenCalledTimes(1)
    expect(onPointClick).toHaveBeenCalledWith({
      x: 2001,
      y: 4,
      customdata: 2001,
      curveNumber: 1,
      pointIndex: 2,
    })
  })

  it('registers the click handler only once across multiple Plotly.react calls (AC 10)', async () => {
    const onPointClick = vi.fn()
    const { rerender } = render(
      <PlotlyChart
        data={DATA}
        layout={LAYOUT}
        ariaLabel="Test chart"
        onPointClick={onPointClick}
      />,
    )
    await flush()
    rerender(
      <PlotlyChart
        data={[...DATA]}
        layout={{ ...LAYOUT }}
        ariaLabel="Test chart"
        onPointClick={onPointClick}
      />,
    )
    await flush()
    expect(plotly.react).toHaveBeenCalledTimes(2)

    const element = graphElement()
    expect(clickHandlerCount(element)).toBe(1)
    act(() => emitClick(element, CLICK_EVENT))
    expect(onPointClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onPointClick when points are missing or empty (AC 10)', async () => {
    const onPointClick = vi.fn()
    render(
      <PlotlyChart
        data={DATA}
        layout={LAYOUT}
        ariaLabel="Test chart"
        onPointClick={onPointClick}
      />,
    )
    await flush()

    act(() => {
      emitClick(graphElement(), {})
      emitClick(graphElement(), { points: [] })
    })

    expect(onPointClick).not.toHaveBeenCalled()
  })

  it('does not throw on click when onPointClick is not provided (AC 10)', async () => {
    render(<PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    expect(() => act(() => emitClick(graphElement(), CLICK_EVENT))).not.toThrow()
  })

  it('uses the latest onPointClick without calling Plotly.react again (AC 11)', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" onPointClick={first} />,
    )
    await flush()

    rerender(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" onPointClick={second} />,
    )
    await flush()
    act(() => emitClick(graphElement(), CLICK_EVENT))

    expect(plotly.react).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('PlotlyChart cleanup and failures (AC 12)', () => {
  it('calls Plotly.purge with the graph element on unmount', async () => {
    const { unmount } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()
    const element = graphElement()

    unmount()

    expect(plotly.purge).toHaveBeenCalledTimes(1)
    expect(plotly.purge).toHaveBeenCalledWith(element)
  })

  it('does not call Plotly.react when unmounted before the import completes', async () => {
    const { unmount } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    unmount()
    await flush()

    expect(plotly.react).not.toHaveBeenCalled()
  })

  it('swallows a rejected Plotly.react and registers the handler after the first successful call', async () => {
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return Promise.reject(new Error('render failed'))
    })
    const onPointClick = vi.fn()
    const { rerender } = render(
      <PlotlyChart
        data={DATA}
        layout={LAYOUT}
        ariaLabel="Test chart"
        onPointClick={onPointClick}
      />,
    )
    await flush()
    expect(clickHandlerCount(graphElement())).toBe(0)

    rerender(
      <PlotlyChart
        data={[...DATA]}
        layout={LAYOUT}
        ariaLabel="Test chart"
        onPointClick={onPointClick}
      />,
    )
    await flush()

    const element = graphElement()
    expect(clickHandlerCount(element)).toBe(1)
    act(() => emitClick(element, CLICK_EVENT))
    expect(onPointClick).toHaveBeenCalledTimes(1)
  })

  it('does not register a click handler when unmounted while Plotly.react is pending, and still purges', async () => {
    const pending = createDeferred<HTMLElement>()
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return pending.promise
    })
    const { unmount } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" onPointClick={vi.fn()} />,
    )
    await flush()
    expect(plotly.react).toHaveBeenCalledTimes(1)
    const element = graphElement()

    unmount()
    expect(plotly.purge).toHaveBeenCalledWith(element)

    await act(async () => {
      pending.resolve(element)
    })
    await flush()

    expect(clickHandlerCount(element)).toBe(0)
  })
})

describe('PlotlyChart render failure message (state polish AC 12-13)', () => {
  it('shows no failure message while rendering succeeds', async () => {
    render(<PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows "Chart could not be displayed." next to the chart when Plotly.react rejects, and clears it after a later success', async () => {
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return Promise.reject(new Error('render failed'))
    })
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Chart could not be displayed.')
    const chart = screen.getByRole('img', { name: 'Test chart' })
    expect(chart).not.toContainElement(alert)
    expect(chart.nextElementSibling).toBe(alert)

    rerender(<PlotlyChart data={[...DATA]} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Test chart' })).toBeInTheDocument()
  })

  // "No state update after unmount" (AC 13) is not observable in the DOM; it is
  // checked in code review. This test only guards against crashes and
  // unhandled rejections when a pending call rejects after unmount.
  it('does not crash or leave an unhandled rejection when Plotly.react rejects after unmount', async () => {
    const unhandled: unknown[] = []
    const recordUnhandled = (reason: unknown) => unhandled.push(reason)
    const nodeProcess = (
      globalThis as unknown as {
        process: {
          on(event: 'unhandledRejection', listener: (reason: unknown) => void): void
          off(event: 'unhandledRejection', listener: (reason: unknown) => void): void
        }
      }
    ).process
    nodeProcess.on('unhandledRejection', recordUnhandled)
    const pending = createDeferred<HTMLElement>()
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return pending.promise
    })
    const { unmount } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()

    unmount()
    await act(async () => {
      pending.reject(new Error('late failure'))
    })
    await flush()
    nodeProcess.off('unhandledRejection', recordUnhandled)

    expect(unhandled).toEqual([])
  })
})

describe('PlotlyChart failure message uses only the latest Plotly.react result (state polish AC 12)', () => {
  it('ignores a rejection from a superseded call that settles after a newer call succeeded', async () => {
    const first = createDeferred<HTMLElement>()
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return first.promise
    })
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()

    rerender(<PlotlyChart data={[...DATA]} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()
    expect(plotly.react).toHaveBeenCalledTimes(2)

    await act(async () => {
      first.reject(new Error('stale failure'))
    })
    await flush()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps an existing failure message while the newer call is pending, and ignores a superseded success', async () => {
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return Promise.reject(new Error('render failed'))
    })
    const { rerender } = render(
      <PlotlyChart data={DATA} layout={LAYOUT} ariaLabel="Test chart" />,
    )
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent('Chart could not be displayed.')

    const second = createDeferred<HTMLElement>()
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return second.promise
    })
    rerender(<PlotlyChart data={[...DATA]} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    expect(screen.getByRole('alert')).toHaveTextContent('Chart could not be displayed.')

    const third = createDeferred<HTMLElement>()
    plotly.react.mockImplementationOnce((element: FakeGraphElement) => {
      attachOn(element)
      return third.promise
    })
    rerender(<PlotlyChart data={[...DATA]} layout={LAYOUT} ariaLabel="Test chart" />)
    await flush()

    await act(async () => {
      second.resolve(graphElement())
    })
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent('Chart could not be displayed.')

    await act(async () => {
      third.resolve(graphElement())
    })
    await flush()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
