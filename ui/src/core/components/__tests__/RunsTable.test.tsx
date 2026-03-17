import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RunsTable } from '../RunsTable'
import type { TraceJourney } from '../../types'

const journeys: TraceJourney[] = [
  {
    traceId: 'run-a',
    rootEntity: 'support@resq.dev',
    startedAt: '2026-03-17T13:00:00.000Z',
    durationMs: 920,
    status: 'success',
    stages: [
      {
        stageId: 'analyze',
        label: 'Analyze',
        startSeq: 1,
        endSeq: 2,
        startTs: '2026-03-17T13:00:00.000Z',
        durationMs: 920,
        status: 'success',
      },
    ],
    nodePath: ['analyze'],
    lastUpdatedAt: '2026-03-17T13:09:00.000Z',
    eventCount: 4,
    identifiers: {},
  },
  {
    traceId: 'run-b',
    rootEntity: 'billing@resq.dev',
    startedAt: '2026-03-17T13:02:00.000Z',
    durationMs: 1_820,
    status: 'error',
    stages: [
      {
        stageId: 'send',
        label: 'Send',
        startSeq: 3,
        endSeq: 4,
        startTs: '2026-03-17T13:02:00.000Z',
        durationMs: 1_820,
        status: 'error',
      },
    ],
    nodePath: ['send'],
    errorSummary: 'Provider timeout',
    lastUpdatedAt: '2026-03-17T13:10:00.000Z',
    eventCount: 5,
    identifiers: {},
  },
  {
    traceId: 'run-c',
    rootEntity: 'ops@resq.dev',
    startedAt: '2026-03-17T13:01:00.000Z',
    durationMs: 1_240,
    status: 'running',
    stages: [
      {
        stageId: 'extract',
        label: 'Extract',
        startSeq: 5,
        endSeq: 6,
        startTs: '2026-03-17T13:01:00.000Z',
        durationMs: 1_240,
        status: 'running',
      },
    ],
    nodePath: ['extract'],
    lastUpdatedAt: '2026-03-17T13:11:00.000Z',
    eventCount: 6,
    identifiers: {},
  },
]

describe('RunsTable', () => {
  it('sorts by duration and keeps the selected row highlighted', async () => {
    const user = userEvent.setup()

    render(
      <RunsTable
        journeys={journeys}
        pinnedTraceIds={new Set()}
        selectedTraceId="run-b"
        onSelectTrace={vi.fn()}
        onTogglePinned={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /duration/i }))

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('support@resq.dev')).toBeInTheDocument()
    const selectedRow = rows.find((row) => row.getAttribute('data-state') === 'selected')
    expect(selectedRow).toBeDefined()
    expect(within(selectedRow!).getByText('billing@resq.dev')).toBeInTheDocument()
  })

  it('supports pinning and row selection independently', async () => {
    const user = userEvent.setup()
    const onSelectTrace = vi.fn()
    const onTogglePinned = vi.fn()

    render(
      <RunsTable
        journeys={journeys}
        pinnedTraceIds={new Set(['run-a'])}
        onSelectTrace={onSelectTrace}
        onTogglePinned={onTogglePinned}
      />,
    )

    const pinnedRow = screen.getAllByRole('row').find((row) =>
      within(row).queryByText('support@resq.dev'),
    )
    expect(pinnedRow).toBeDefined()

    await user.click(within(pinnedRow!).getByRole('button', { name: /unpin/i }))
    expect(onTogglePinned).toHaveBeenCalledWith('run-a')
    expect(onSelectTrace).not.toHaveBeenCalled()

    await user.click(screen.getByText('billing@resq.dev'))
    expect(onSelectTrace).toHaveBeenCalledWith('run-b')
    expect(screen.getByText('Provider timeout')).toBeInTheDocument()
  })
})
