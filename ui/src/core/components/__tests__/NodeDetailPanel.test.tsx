import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NodeDetailContent } from '../NodeDetailPanel'
import type { FlowNodeConfig, LogEntry } from '../../types'

const node: FlowNodeConfig = {
  id: 'incoming-queue',
  type: 'rectangle',
  semanticRole: 'queue',
  label: 'Incoming Queue',
  position: { x: 0, y: 0 },
}

const logs: LogEntry[] = [
  {
    timestamp: '2026-03-23T12:00:06.000Z',
    level: 'info',
    nodeId: 'incoming-queue',
    message: 'latest activity',
    displayMessage: 'latest activity',
    signal: 'meaningful',
    defaultVisible: true,
    eventType: 'log',
    traceId: 'run-latest',
    runId: 'run-latest',
  },
  {
    timestamp: '2026-03-23T12:00:05.000Z',
    level: 'info',
    nodeId: 'incoming-queue',
    message: 'activity 5',
    displayMessage: 'activity 5',
    signal: 'meaningful',
    defaultVisible: true,
    eventType: 'log',
    traceId: 'run-5',
    runId: 'run-5',
  },
  {
    timestamp: '2026-03-23T12:00:04.000Z',
    level: 'info',
    nodeId: 'incoming-queue',
    message: 'activity 4',
    displayMessage: 'activity 4',
    signal: 'meaningful',
    defaultVisible: true,
    eventType: 'log',
    traceId: 'run-4',
    runId: 'run-4',
  },
  {
    timestamp: '2026-03-23T12:00:03.000Z',
    level: 'info',
    nodeId: 'incoming-queue',
    message: 'activity 3',
    displayMessage: 'activity 3',
    signal: 'meaningful',
    defaultVisible: true,
    eventType: 'log',
    traceId: 'run-3',
    runId: 'run-3',
  },
  {
    timestamp: '2026-03-23T12:00:02.000Z',
    level: 'info',
    nodeId: 'incoming-queue',
    message: 'activity 2',
    displayMessage: 'activity 2',
    signal: 'meaningful',
    defaultVisible: true,
    eventType: 'log',
    traceId: 'run-2',
    runId: 'run-2',
  },
  {
    timestamp: '2026-03-23T12:00:01.000Z',
    level: 'info',
    nodeId: 'incoming-queue',
    message: 'activity 1',
    displayMessage: 'activity 1',
    signal: 'meaningful',
    defaultVisible: true,
    eventType: 'log',
    traceId: 'run-1',
    runId: 'run-1',
  },
]

describe('NodeDetailContent', () => {
  it('shows recent activity across recent runs instead of limiting to the latest run', () => {
    render(<NodeDetailContent node={node} logs={logs} spans={[]} />)

    expect(screen.getByText('most recent first')).toBeInTheDocument()
    expect(screen.getByText('latest activity')).toBeInTheDocument()
    expect(screen.queryByText('activity 1')).not.toBeInTheDocument()
  })

  it('shows the latest meaningful entry per run and labels activity when multiple runs are present', () => {
    render(
      <NodeDetailContent
        node={node}
        logs={[
          {
            timestamp: '2026-03-23T12:00:06.000Z',
            seq: 6,
            level: 'info',
            nodeId: 'incoming-queue',
            message: 'latest activity',
            displayMessage: 'latest activity',
            signal: 'meaningful',
            defaultVisible: true,
            eventType: 'log',
            traceId: 'trace-1',
            runId: 'run-1',
            attributes: { thread_id: 'thread-1' },
          },
          {
            timestamp: '2026-03-23T12:00:05.000Z',
            seq: 5,
            level: 'info',
            nodeId: 'incoming-queue',
            message: 'older activity same run',
            displayMessage: 'older activity same run',
            signal: 'meaningful',
            defaultVisible: true,
            eventType: 'log',
            traceId: 'trace-1',
            runId: 'run-1',
            attributes: { thread_id: 'thread-1' },
          },
          {
            timestamp: '2026-03-23T12:00:04.000Z',
            seq: 4,
            level: 'info',
            nodeId: 'incoming-queue',
            message: 'other run activity',
            displayMessage: 'other run activity',
            signal: 'meaningful',
            defaultVisible: true,
            eventType: 'log',
            traceId: 'trace-2',
            runId: 'run-2',
            attributes: { thread_id: 'thread-2' },
          },
        ]}
        spans={[]}
      />,
    )

    expect(screen.getByText('thread thread-1')).toBeInTheDocument()
    expect(screen.getByText('thread thread-2')).toBeInTheDocument()
    expect(screen.getByText('latest activity')).toBeInTheDocument()
    expect(screen.getByText('other run activity')).toBeInTheDocument()
    expect(screen.queryByText('older activity same run')).not.toBeInTheDocument()
  })

  it('shows the latest failure block with the error message when a recent error is present', () => {
    render(
      <NodeDetailContent
        node={node}
        logs={[
          {
            timestamp: '2026-03-23T12:00:06.000Z',
            level: 'error',
            nodeId: 'incoming-queue',
            message: 'fallback failure',
            displayMessage: 'fallback failure',
            signal: 'critical',
            defaultVisible: true,
            eventType: 'log',
            traceId: 'run-latest',
            runId: 'run-latest',
            attributes: { error_message: 'Provider timed out after 30s' },
          },
        ]}
        spans={[]}
      />,
    )

    expect(screen.getByText('Provider timed out after 30s')).toBeInTheDocument()
  })

  it('does not show the latest failure block when no error logs are present', () => {
    render(<NodeDetailContent node={node} logs={logs} spans={[]} />)

    expect(screen.queryByText('Provider timed out after 30s')).not.toBeInTheDocument()
  })

  it('opens the latest failure run when the link is clicked', () => {
    const onOpenRun = vi.fn()

    render(
      <NodeDetailContent
        node={node}
        logs={[
          {
            timestamp: '2026-03-23T12:00:06.000Z',
            level: 'error',
            nodeId: 'incoming-queue',
            message: 'failure',
            displayMessage: 'failure',
            signal: 'critical',
            defaultVisible: true,
            eventType: 'log',
            traceId: 'trace-latest',
            runId: 'run-latest',
            attributes: { error_message: 'Provider timed out after 30s' },
          },
        ]}
        spans={[]}
        onOpenRun={onOpenRun}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View run' }))

    expect(onOpenRun).toHaveBeenCalledWith('run-latest')
  })

  it('does not show view run for a trace-only ambient error', () => {
    render(
      <NodeDetailContent
        node={node}
        logs={[
          {
            timestamp: '2026-03-23T12:00:06.000Z',
            level: 'error',
            nodeId: 'incoming-queue',
            message: 'failure',
            displayMessage: 'failure',
            signal: 'critical',
            defaultVisible: true,
            eventType: 'log',
            traceId: 'trace-latest',
            runId: undefined,
            attributes: { error_message: 'Provider timed out after 30s' },
          },
        ]}
        spans={[]}
        onOpenRun={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'View run' })).not.toBeInTheDocument()
  })

  it('caps recent activity at five entries', () => {
    render(<NodeDetailContent node={node} logs={logs} spans={[]} />)

    expect(screen.getByText('latest activity')).toBeInTheDocument()
    expect(screen.getByText('activity 2')).toBeInTheDocument()
    expect(screen.queryByText('activity 1')).not.toBeInTheDocument()
  })
})
