import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compareFlowEventsForDisplay, normalizeFlowEvent } from '../core/events'
import { inferErrorState, resolveMappedNodeId } from '../core/mapping'
import type { FlowConfig, FlowEvent } from '../core/types'
import { flows } from '../flows'

function readStringAttribute(
  event: FlowEvent,
  key: string,
): string | undefined {
  const value = event.attributes?.[key]
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function eventStepRef(event: FlowEvent): string | undefined {
  const componentId = readStringAttribute(event, 'component_id')
  const stepId = readStringAttribute(event, 'step_id')
  if (!componentId || !stepId) {
    return undefined
  }
  return `${componentId}.${stepId}`
}

function eventMatchesAny(value: string | undefined, expected: string[] | undefined): boolean {
  if (!expected || expected.length === 0) {
    return true
  }
  if (!value) {
    return false
  }
  return expected.includes(value)
}

interface ReplayEventSelector {
  runIds?: string[]
  threadIds?: string[]
  componentIds?: string[]
  stepIds?: string[]
  stepRefs?: string[]
  functionNames?: string[]
  messages?: string[]
}

interface ReplayEventPatch {
  match: ReplayEventSelector
  setAttributes?: Record<string, unknown>
  setMessage?: string
}

interface ReplayEventExclude {
  componentIds?: string[]
  stepRefs?: string[]
  statuses?: string[]
}

export interface ReplayScenario {
  id: string
  name: string
  description: string
  flowId: string
  sourceFixture: string
  selectors: ReplayEventSelector[]
  patches?: ReplayEventPatch[]
  exclude?: ReplayEventExclude
  allowErrorEvents?: boolean
  expectedMappedNodes?: string[]
  forbiddenMappedNodes?: string[]
}

export interface LoadedReplayScenario {
  scenario?: ReplayScenario
  flow?: FlowConfig
  events: FlowEvent[]
}

interface ReplayScenarioSummary {
  eventCount: number
  mappedNodeIds: string[]
  runIds: string[]
  threadIds: string[]
}

const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './fixtures')
const DEFAULT_FIXTURE = 'mail-pipeline-replay.json'

const DEMO_HAPPY_SCENARIO_ID = 'demo-happy'

export const replayScenarios: Record<string, ReplayScenario> = {
  [DEMO_HAPPY_SCENARIO_ID]: {
    id: DEMO_HAPPY_SCENARIO_ID,
    name: 'Mail Demo Happy Path',
    description: 'Curated happy-path storyboard for the mail pipeline demo.',
    flowId: 'mail-pipeline',
    sourceFixture: DEFAULT_FIXTURE,
    selectors: [
      { runIds: ['backfill:gmail:ops@resq.ai:2026-03-09T16:00:00.000Z'] },
      { threadIds: ['thread-201'] },
      { runIds: ['cron-tick:gmail:ops@resq.ai:2026-03-09T16:00:00.068Z'] },
      { runIds: ['incoming-check:gmail:ops@resq.ai:2026-03-09T16:00:00.072Z'] },
      { threadIds: ['thread-301'] },
    ],
    patches: [
      {
        match: {
          stepIds: ['send-enqueue'],
          functionNames: ['handle_mail_send_reply'],
          messages: ['execute-approved send handoff result'],
        },
        setAttributes: {
          component_id: 'autosend-decision',
        },
      },
    ],
    exclude: {
      statuses: ['error'],
    },
    expectedMappedNodes: [
      'backfill-queue',
      'backfill-worker',
      'backfill-thread-metadata-write',
      'extract-queue',
      'extract-worker',
      'cron-scheduler',
      'incoming-queue',
      'incoming-scheduled-at',
      'incoming-worker',
      'incoming-thread-metadata-write',
      'update-history',
      'analyze-queue',
      'analyze-worker',
      'analyze-decision',
      'draft-reply',
      'autosend-decision',
      'actions-queue',
      'send-queue',
      'send-worker',
      'send-process',
    ],
    forbiddenMappedNodes: [
      'extract-fail-1',
      'analyze-error',
      'pause-manual-approval',
      'manual-approval-api',
      'send-needs-review',
      'send-terminal-nonsend',
    ],
  },
}

function replayFixturePath(filename = DEFAULT_FIXTURE): string {
  return path.resolve(FIXTURES_DIR, filename)
}

async function loadReplayFixture(filename = DEFAULT_FIXTURE): Promise<FlowEvent[]> {
  const content = await readFile(replayFixturePath(filename), 'utf8')
  return JSON.parse(content) as FlowEvent[]
}

function eventMatchesSelector(event: FlowEvent, selector: ReplayEventSelector): boolean {
  return (
    eventMatchesAny(readStringAttribute(event, 'run_id'), selector.runIds) &&
    eventMatchesAny(readStringAttribute(event, 'thread_id'), selector.threadIds) &&
    eventMatchesAny(readStringAttribute(event, 'component_id'), selector.componentIds) &&
    eventMatchesAny(readStringAttribute(event, 'step_id'), selector.stepIds) &&
    eventMatchesAny(eventStepRef(event), selector.stepRefs) &&
    eventMatchesAny(readStringAttribute(event, 'function_name'), selector.functionNames) &&
    eventMatchesAny(event.message ?? event.span_name, selector.messages)
  )
}

function eventMatchesExclude(event: FlowEvent, exclude: ReplayEventExclude | undefined): boolean {
  if (!exclude) {
    return false
  }

  if (exclude.componentIds?.includes(readStringAttribute(event, 'component_id') ?? '')) {
    return true
  }

  if (exclude.stepRefs?.includes(eventStepRef(event) ?? '')) {
    return true
  }

  const status = readStringAttribute(event, 'status')?.toLowerCase()
  if (status && exclude.statuses?.map((value) => value.toLowerCase()).includes(status)) {
    return true
  }

  return false
}

function applyPatch(event: FlowEvent, patch: ReplayEventPatch): FlowEvent {
  if (!eventMatchesSelector(event, patch.match)) {
    return event
  }

  return {
    ...event,
    message: patch.setMessage ?? event.message,
    attributes: patch.setAttributes
      ? {
          ...(event.attributes ?? {}),
          ...patch.setAttributes,
        }
      : event.attributes,
  }
}

function normalizeSortedEvents(events: FlowEvent[]): FlowEvent[] {
  return [...events]
    .sort(compareFlowEventsForDisplay)
    .map((event, index) => normalizeFlowEvent(event, index + 1))
}

function scenarioFlow(scenario: ReplayScenario): FlowConfig | undefined {
  return flows.find((flow) => flow.id === scenario.flowId)
}

function validateScenario(
  rawFixtureEvents: FlowEvent[],
  events: FlowEvent[],
  scenario: ReplayScenario,
  flow: FlowConfig | undefined,
): string[] {
  const errors: string[] = []

  if (!flow) {
    errors.push(`Unknown flow id "${scenario.flowId}" for replay scenario "${scenario.id}".`)
    return errors
  }

  if (events.length === 0) {
    errors.push(`Replay scenario "${scenario.id}" produced no events.`)
  }

  scenario.selectors.forEach((selector, index) => {
    const selectorMatched = rawFixtureEvents.some((event) => eventMatchesSelector(event, selector))
    if (!selectorMatched) {
      errors.push(`Replay scenario "${scenario.id}" selector ${index + 1} did not match any source events.`)
    }
  })

  if (!scenario.allowErrorEvents) {
    const errorEvent = events.find((event) => inferErrorState(event))
    if (errorEvent) {
      errors.push(
        `Replay scenario "${scenario.id}" still includes an error event: ${errorEvent.message ?? errorEvent.span_name ?? errorEvent.type}.`,
      )
    }
  }

  const mappedNodeIds = new Set(
    events
      .map((event) => resolveMappedNodeId(event, flow.spanMapping))
      .filter((nodeId): nodeId is string => Boolean(nodeId)),
  )

  for (const expectedNodeId of scenario.expectedMappedNodes ?? []) {
    if (!mappedNodeIds.has(expectedNodeId)) {
      errors.push(`Replay scenario "${scenario.id}" is missing mapped node "${expectedNodeId}".`)
    }
  }

  for (const forbiddenNodeId of scenario.forbiddenMappedNodes ?? []) {
    if (mappedNodeIds.has(forbiddenNodeId)) {
      errors.push(`Replay scenario "${scenario.id}" unexpectedly includes forbidden node "${forbiddenNodeId}".`)
    }
  }

  return errors
}

export async function loadReplaySelection(options?: {
  scenarioId?: string
}): Promise<LoadedReplayScenario> {
  const scenarioId = options?.scenarioId?.trim()
  if (!scenarioId) {
    return {
      events: normalizeSortedEvents(await loadReplayFixture()),
    }
  }

  const scenario = replayScenarios[scenarioId]
  if (!scenario) {
    throw new Error(`Unknown replay scenario "${scenarioId}".`)
  }

  const sourceFixtureEvents = await loadReplayFixture(scenario.sourceFixture)
  const patchedSourceEvents = (scenario.patches ?? []).reduce(
    (events, patch) => events.map((event) => applyPatch(event, patch)),
    sourceFixtureEvents,
  )

  const scenarioEvents = patchedSourceEvents.filter((event) =>
    scenario.selectors.some((selector) => eventMatchesSelector(event, selector)),
  )
  const filteredEvents = scenarioEvents.filter((event) => !eventMatchesExclude(event, scenario.exclude))
  const normalizedEvents = normalizeSortedEvents(filteredEvents)
  const flow = scenarioFlow(scenario)
  const errors = validateScenario(patchedSourceEvents, normalizedEvents, scenario, flow)

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  return {
    scenario,
    flow,
    events: normalizedEvents,
  }
}

export function summarizeReplaySelection(selection: LoadedReplayScenario): ReplayScenarioSummary {
  const mappedNodeIds = new Set<string>()
  const runIds = new Set<string>()
  const threadIds = new Set<string>()
  const flow = selection.flow ?? (selection.scenario ? scenarioFlow(selection.scenario) : undefined)

  for (const event of selection.events) {
    if (flow) {
      const mappedNodeId = resolveMappedNodeId(event, flow.spanMapping)
      if (mappedNodeId) {
        mappedNodeIds.add(mappedNodeId)
      }
    }

    const runId = readStringAttribute(event, 'run_id')
    if (runId) {
      runIds.add(runId)
    }

    const threadId = readStringAttribute(event, 'thread_id')
    if (threadId) {
      threadIds.add(threadId)
    }
  }

  return {
    eventCount: selection.events.length,
    mappedNodeIds: [...mappedNodeIds].sort((left, right) => left.localeCompare(right)),
    runIds: [...runIds].sort((left, right) => left.localeCompare(right)),
    threadIds: [...threadIds].sort((left, right) => left.localeCompare(right)),
  }
}
