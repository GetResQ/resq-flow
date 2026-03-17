import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LogsView } from '../LogsView'
import type { FlowConfig, LogEntry } from '../../types'

const flow: FlowConfig = {
  id: 'mail-pipeline',
  name: 'Mail Pipeline',
  contract: {
    version: 1,
    id: 'mail-pipeline',
    name: 'Mail Pipeline',
    telemetry: {
      log_events: [],
      queue_prefixes: [],
      function_prefixes: [],
      worker_prefixes: [],
      stage_prefixes: [],
    },
    keep_context: {
      parent_spans: false,
      root_spans: false,
      error_events: false,
      unmapped_events_for_kept_traces: false,
    },
  },
  hasGraph: true,
  nodes: [
    {
      id: 'analyze',
      type: 'rectangle',
      label: 'Analyze',
      position: { x: 0, y: 0 },
    },
    {
      id: 'send',
      type: 'rectangle',
      label: 'Send',
      position: { x: 0, y: 0 },
    },
  ],
  edges: [],
  spanMapping: {},
}

const logs: LogEntry[] = [
  {
    timestamp: '2026-03-17T13:10:00.000Z',
    level: 'info',
    nodeId: 'analyze',
    message: 'Analysis complete',
    eventType: 'log',
    traceId: 'run-1',
  },
  {
    timestamp: '2026-03-17T13:11:00.000Z',
    level: 'error',
    nodeId: 'send',
    message: 'Provider timeout',
    eventType: 'log',
    traceId: 'run-2',
  },
]

describe('LogsView', () => {
  it('renders the log stream and filters by status', async () => {
    const user = userEvent.setup()

    render(
      <LogsView
        flow={flow}
        logs={logs}
        sourceMode="live"
        onSelectNode={vi.fn()}
        onSelectTrace={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText(/search logs/i)).toBeInTheDocument()
    expect(screen.getByText('Analysis complete')).toBeInTheDocument()
    expect(screen.getByText('Provider timeout')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'error' }))

    expect(screen.queryByText('Analysis complete')).not.toBeInTheDocument()
    expect(screen.getByText('Provider timeout')).toBeInTheDocument()
  })
})
