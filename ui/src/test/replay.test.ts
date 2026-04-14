import { describe, expect, it } from 'vitest'

import type { FlowEvent } from '../core/types'

import { rebaseReplayEventsForLivePlayback } from './replay'

describe('rebaseReplayEventsForLivePlayback', () => {
  it('rebases replay timestamps to the requested anchor while preserving relative timing', () => {
    const sourceEvents: FlowEvent[] = [
      {
        type: 'span_start',
        timestamp: '2026-03-09T16:00:00.000Z',
        start_time: '2026-03-09T16:00:00.000Z',
        span_name: 'handle_mail_backfill_start',
      },
      {
        type: 'span_end',
        timestamp: '2026-03-09T16:00:00.222Z',
        end_time: '2026-03-09T16:00:00.222Z',
        span_name: 'handle_mail_backfill_start',
      },
    ]

    const rebased = rebaseReplayEventsForLivePlayback(sourceEvents, Date.parse('2026-04-14T20:00:00.000Z'))

    expect(rebased[0]?.timestamp).toBe('2026-04-14T20:00:00.000Z')
    expect(rebased[0]?.start_time).toBe('2026-04-14T20:00:00.000Z')
    expect(rebased[1]?.timestamp).toBe('2026-04-14T20:00:00.222Z')
    expect(rebased[1]?.end_time).toBe('2026-04-14T20:00:00.222Z')
  })

  it('returns the original list when the first event timestamp is not parseable', () => {
    const sourceEvents: FlowEvent[] = [
      {
        type: 'log',
        timestamp: 'not-a-date',
        message: 'test',
      },
    ]

    expect(rebaseReplayEventsForLivePlayback(sourceEvents)).toBe(sourceEvents)
  })
})
