import { describe, expect, it } from 'vitest'

import type { TraceJourney } from '../types'
import {
  formatRunLabel,
  formatStepDisplayLabel,
  formatStepLabel,
  getJourneySummaryStep,
  getOverviewSteps,
  isDefaultVisibleJourney,
} from '../runPresentation'

function makeJourney(overrides: Partial<TraceJourney> = {}): TraceJourney {
  return {
    traceId: 'trace-1',
    startedAt: '2026-03-24T12:00:00.000Z',
    durationMs: 450,
    status: 'success',
    steps: [],
    nodePath: [],
    lastUpdatedAt: '2026-03-24T12:00:01.000Z',
    eventCount: 1,
    identifiers: {},
    ...overrides,
  }
}

describe('runPresentation', () => {
  it('prefers meaningful mailbox and thread identifiers over placeholder root labels', () => {
    const journey = makeJourney({
      rootEntity: '0',
      identifiers: {
        mailboxOwner: 'jrojas@getresq.com',
        threadId: '19d1f6ffa726e354',
      },
    })

    expect(formatRunLabel(journey)).toBe('jrojas@getresq.com · thread 19d1f6ffa726…')
  })

  it('humanizes canonical step labels', () => {
    expect(
      formatStepLabel({
        stepId: 'extract.final_result',
        label: 'extract.final_result',
        nodeId: 'extract-worker',
      }),
    ).toBe('Extract worker · Final result')
  })

  it('prefers outcome summaries for lifecycle steps when attrs are present', () => {
    expect(
      formatStepDisplayLabel({
        stepId: 'analyze.final_result',
        label: 'analyze.final_result',
        nodeId: 'analyze-decision',
        attrs: {
          reply_status: 'needs_review',
          draft_status: 'needs_review',
          result_action: 'draft_reply',
          auto_approved: false,
        },
      }),
    ).toBe('drafted; awaiting manual review')

    expect(
      formatStepDisplayLabel({
        stepId: 'send.final_result',
        label: 'send.final_result',
        nodeId: 'send-process',
        attrs: {
          reply_status: 'sent',
          draft_status: 'sent',
          result_action: 'sent',
        },
      }),
    ).toBe('sent')
  })

  it('shows lifecycle runs by default and hides pure sidecars', () => {
    const lifecycleJourney = makeJourney({
      identifiers: {
        threadId: 'thread-1',
      },
      steps: [
        {
          stepId: 'send.final_result',
          label: 'send.final_result',
          nodeId: 'send-process',
          startSeq: 1,
          endSeq: 1,
          startTs: '2026-03-24T12:00:00.000Z',
          durationMs: 0,
          status: 'success',
        },
      ],
    })
    const sidecarJourney = makeJourney({
      identifiers: {
        requestId: 'request-1',
      },
      steps: [
        {
          stepId: 'scheduler.cursor_update',
          label: 'scheduler.cursor_update',
          nodeId: 'cron-scheduler',
          startSeq: 1,
          endSeq: 1,
          startTs: '2026-03-24T12:00:00.000Z',
          durationMs: 0,
          status: 'success',
        },
      ],
    })

    expect(isDefaultVisibleJourney(lifecycleJourney)).toBe(true)
    expect(isDefaultVisibleJourney(sidecarJourney)).toBe(false)
  })

  it('prefers the last lifecycle stage over generic worker wrappers for run summaries', () => {
    const journey = makeJourney({
      steps: [
        {
          stepId: 'worker.pickup',
          label: 'worker.pickup',
          nodeId: 'analyze-worker',
          startSeq: 1,
          endSeq: 1,
          startTs: '2026-03-24T12:00:00.000Z',
          durationMs: 0,
          status: 'success',
        },
        {
          stepId: 'analyze.final_result',
          label: 'analyze.final_result',
          nodeId: 'analyze-decision',
          startSeq: 2,
          endSeq: 2,
          startTs: '2026-03-24T12:00:01.000Z',
          durationMs: 0,
          status: 'success',
          attrs: {
            reply_status: 'needs_review',
            draft_status: 'needs_review',
            result_action: 'draft_reply',
            auto_approved: false,
          },
        },
        {
          stepId: 'worker.result',
          label: 'worker.result',
          nodeId: 'analyze-worker',
          startSeq: 3,
          endSeq: 3,
          startTs: '2026-03-24T12:00:02.000Z',
          durationMs: 0,
          status: 'success',
        },
      ],
    })

    expect(getJourneySummaryStep(journey)?.stepId).toBe('analyze.final_result')
    expect(getOverviewSteps(journey.steps).map((stage) => stage.stepId)).toEqual(['analyze.final_result'])
  })

  it('keeps lifecycle transitions and hides bookkeeping steps in overview', () => {
    const steps = [
      {
        stepId: 'analyze.reply_status_write',
        label: 'analyze.reply_status_write',
        nodeId: 'analyze-decision',
        startSeq: 1,
        endSeq: 1,
        startTs: '2026-03-24T12:00:00.000Z',
        durationMs: 0,
        status: 'success' as const,
      },
      {
        stepId: 'extract.recompute_enqueue',
        label: 'extract.recompute_enqueue',
        nodeId: 'extract-worker',
        startSeq: 2,
        endSeq: 2,
        startTs: '2026-03-24T12:00:01.000Z',
        durationMs: 0,
        status: 'success' as const,
      },
      {
        stepId: 'recompute.final_result',
        label: 'recompute.final_result',
        nodeId: 'extract-worker',
        startSeq: 3,
        endSeq: 3,
        startTs: '2026-03-24T12:00:02.000Z',
        durationMs: 0,
        status: 'success' as const,
      },
      {
        stepId: 'worker.result',
        label: 'worker.result',
        nodeId: 'extract-worker',
        startSeq: 4,
        endSeq: 4,
        startTs: '2026-03-24T12:00:03.000Z',
        durationMs: 0,
        status: 'success' as const,
      },
    ]

    expect(getOverviewSteps(steps).map((stage) => stage.stepId)).toEqual([
      'extract.recompute_enqueue',
      'recompute.final_result',
    ])
  })
})
