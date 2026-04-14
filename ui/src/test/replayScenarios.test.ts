import { describe, expect, it } from 'vitest'

import { inferErrorState, resolveMappedNodeId } from '../core/mapping'
import { mailPipelineFlow } from '../flows/mail-pipeline'
import { loadReplaySelection, summarizeReplaySelection } from './replayScenarios'

describe('replayScenarios', () => {
  it('loads the curated happy-path demo scenario without failed branches', async () => {
    const selection = await loadReplaySelection({ scenarioId: 'demo-happy' })
    const summary = summarizeReplaySelection(selection)

    expect(selection.scenario?.id).toBe('demo-happy')
    expect(selection.events.length).toBeGreaterThan(0)
    expect(selection.events.some((event) => inferErrorState(event))).toBe(false)
    expect(
      selection.events.some((event) => event.attributes?.thread_id === 'thread-202'),
    ).toBe(false)

    const mappedNodeIds = new Set(
      selection.events
        .map((event) => resolveMappedNodeId(event, mailPipelineFlow.spanMapping))
        .filter((nodeId): nodeId is string => Boolean(nodeId)),
    )

    expect(mappedNodeIds.has('backfill-worker')).toBe(true)
    expect(mappedNodeIds.has('cron-scheduler')).toBe(true)
    expect(mappedNodeIds.has('analyze-worker')).toBe(true)
    expect(mappedNodeIds.has('actions-queue')).toBe(true)
    expect(mappedNodeIds.has('send-process')).toBe(true)
    expect(mappedNodeIds.has('extract-fail-1')).toBe(false)
    expect(mappedNodeIds.has('send-needs-review')).toBe(false)

    const sendHandoff = selection.events.find(
      (event) => event.message === 'execute-approved send handoff result',
    )
    expect(sendHandoff?.attributes?.component_id).toBe('autosend-decision')

    expect(summary.threadIds).toEqual(['thread-201', 'thread-301'])
  })
})
