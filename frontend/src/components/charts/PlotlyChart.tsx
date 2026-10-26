import { useEffect, useRef, useState } from 'react'
import type {
  Config,
  Data,
  Layout,
  PlotlyHTMLElement,
  PlotMouseEvent,
} from 'plotly.js'
import { ErrorMessage } from '../ui/ErrorMessage'

type PlotlyModule = typeof import('plotly.js-dist-min').default

export type PlotlyPointClick = {
  x: unknown
  y: unknown
  customdata: unknown
  curveNumber: number
  pointIndex: number
}

type PlotlyChartProps = {
  data: Data[]
  layout: Partial<Layout>
  ariaLabel: string
  onPointClick?: (point: PlotlyPointClick) => void
}

const PLOTLY_CONFIG: Partial<Config> = {
  responsive: true,
  displayModeBar: false,
}

let plotlyPromise: Promise<PlotlyModule> | null = null

// Plotly is large, so it is loaded lazily into its own chunk and shared by
// every chart on the page.
function loadPlotly(): Promise<PlotlyModule> {
  if (!plotlyPromise) {
    plotlyPromise = import('plotly.js-dist-min').then(
      (mod) => (mod.default ?? mod) as PlotlyModule,
    )
    plotlyPromise.catch(() => {
      plotlyPromise = null
    })
  }
  return plotlyPromise
}

export function PlotlyChart({ data, layout, ariaLabel, onPointClick }: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onPointClickRef = useRef(onPointClick)
  const clickHandlerAttachedRef = useRef(false)
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null)
  const [renderFailed, setRenderFailed] = useState(false)

  useEffect(() => {
    onPointClickRef.current = onPointClick
  }, [onPointClick])

  useEffect(() => {
    let cancelled = false

    loadPlotly()
      .then((module) => {
        if (!cancelled) {
          setPlotly(() => module)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!plotly || !element) {
      return
    }

    return () => {
      plotly.purge(element)
      clickHandlerAttachedRef.current = false
    }
  }, [plotly])

  useEffect(() => {
    const element = containerRef.current
    if (!plotly || !element) {
      return
    }

    let active = true

    function handleClick(event: PlotMouseEvent) {
      const point = event?.points?.[0]
      if (!point) {
        return
      }
      onPointClickRef.current?.({
        x: point.x,
        y: point.y,
        customdata: point.customdata,
        curveNumber: point.curveNumber,
        pointIndex: point.pointIndex,
      })
    }

    plotly
      .react(element, data, layout, PLOTLY_CONFIG)
      .then(() => {
        // Only the latest call (still active) decides what is shown.
        if (!active) {
          return
        }
        setRenderFailed(false)
        if (clickHandlerAttachedRef.current) {
          return
        }
        clickHandlerAttachedRef.current = true
        ;(element as unknown as PlotlyHTMLElement).on('plotly_click', handleClick)
      })
      .catch(() => {
        if (active) {
          setRenderFailed(true)
        }
      })

    return () => {
      active = false
    }
  }, [plotly, data, layout])

  return (
    <>
      <div ref={containerRef} className="plotly-chart" role="img" aria-label={ariaLabel} />
      {renderFailed ? (
        <ErrorMessage className="plotly-chart__error">Chart could not be displayed.</ErrorMessage>
      ) : null}
    </>
  )
}
