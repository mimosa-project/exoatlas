import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PlotlyChart } from './PlotlyChart'

vi.mock('plotly.js-dist-min', () => {
  throw new Error('chunk load failed')
})

type NodeProcess = {
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): void
  off(event: 'unhandledRejection', listener: (reason: unknown) => void): void
}

// tsconfig.app.json only includes vite/client types, so reach Node's process via globalThis.
const nodeProcess = (globalThis as unknown as { process: NodeProcess }).process

const unhandled: unknown[] = []
function recordUnhandled(reason: unknown) {
  unhandled.push(reason)
}

beforeEach(() => {
  unhandled.length = 0
  nodeProcess.on('unhandledRejection', recordUnhandled)
})

afterEach(() => {
  nodeProcess.off('unhandledRejection', recordUnhandled)
})

describe('PlotlyChart dynamic import failure (AC 12)', () => {
  it('swallows the import error without an unhandled rejection and leaves the chart empty', async () => {
    render(
      <PlotlyChart
        data={[{ type: 'bar', x: [2000], y: [1] }]}
        layout={{}}
        ariaLabel="Test chart"
      />,
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(screen.getByRole('img', { name: 'Test chart' })).toBeInTheDocument()
    expect(unhandled).toEqual([])
  })
})
