import { describe, expect, it } from 'vitest'

import { eventMatchesFlow, parseRelayEvents } from '../events'

describe('events helpers', () => {
  it('parses snapshot envelopes and normalizes missing fields', () => {
    const events = parseRelayEvents(
      JSON.stringify({
        type: 'snapshot',
        events: [
          {
            type: 'log',
            timestamp: '2026-03-05T12:00:00.000Z',
            attributes: {
              action: 'enqueue',
              queue_name: 'rrq:queue:mail-analyze',
            },
          },
        ],
      }),
      10,
    )

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      seq: 11,
      event_kind: 'queue_enqueued',
      queue_delta: 1,
      node_key: 'rrq:queue:mail-analyze',
    })
  })

  it('parses bare events and preserves explicit sequence numbers', () => {
    const events = parseRelayEvents(
      JSON.stringify({
        type: 'span_end',
        seq: 42,
        timestamp: '2026-03-05T12:00:01.000Z',
        span_name: 'handle_mail_extract',
      }),
      10,
    )

    expect(events).toEqual([
      expect.objectContaining({
        type: 'span_end',
        seq: 42,
        event_kind: 'node_finished',
        node_key: 'handle_mail_extract',
      }),
    ])
  })

  it('parses legacy array payloads and drops invalid entries', () => {
    const events = parseRelayEvents(
      JSON.stringify([
        { type: 'log', timestamp: '2026-03-05T12:00:00.000Z', message: 'kept' },
        { nope: true },
      ]),
      0,
    )

    expect(events).toHaveLength(1)
    expect(events[0].message).toBe('kept')
  })

  it('matches flows by matched_flow_ids when present', () => {
    expect(
      eventMatchesFlow(
        {
          type: 'log',
          timestamp: '2026-03-05T12:00:00.000Z',
          matched_flow_ids: ['mail-pipeline'],
        },
        'mail-pipeline',
      ),
    ).toBe(true)

    expect(
      eventMatchesFlow(
        {
          type: 'log',
          timestamp: '2026-03-05T12:00:00.000Z',
          matched_flow_ids: ['mail-pipeline'],
        },
        'other-flow',
      ),
    ).toBe(false)

    expect(
      eventMatchesFlow(
        {
          type: 'log',
          timestamp: '2026-03-05T12:00:00.000Z',
        },
        'any-flow',
      ),
    ).toBe(true)
  })
})
