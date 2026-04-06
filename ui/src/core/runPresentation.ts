import type { TraceJourney, TraceStep } from './types'
import {
  getStepPresentationTier,
  isGenericOperationalStep,
  isLifecycleTerminalStep,
  summarizeStepOutcome,
} from './stepOutcomePresentation'
import { normalizeTraceIdentifierValue } from './traceIdentifiers'

function compactIdentifier(value: string, maxLength = 10): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}…`
}

function humanizeMachineLabel(value: string): string {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_:.\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return '-'
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

function stepLeaf(stepId: string): string {
  const withoutNamespace = stepId.split('::').at(-1) ?? stepId
  return withoutNamespace.split('.').at(-1) ?? withoutNamespace
}

function preferredRunIdentity(journey: TraceJourney): string | undefined {
  const mailboxOwner = normalizeTraceIdentifierValue(journey.identifiers.mailboxOwner)
  const threadId = normalizeTraceIdentifierValue(journey.identifiers.threadId)
  const replyDraftId = normalizeTraceIdentifierValue(journey.identifiers.replyDraftId)
  const requestId = normalizeTraceIdentifierValue(journey.identifiers.requestId)
  const journeyKey = normalizeTraceIdentifierValue(journey.identifiers.journeyKey)
  const runId = normalizeTraceIdentifierValue(journey.identifiers.runId)
  const jobId = normalizeTraceIdentifierValue(journey.identifiers.jobId)
  const rootEntity = normalizeTraceIdentifierValue(journey.rootEntity)

  if (mailboxOwner && threadId) {
    return `${mailboxOwner} · thread ${compactIdentifier(threadId, 12)}`
  }
  if (mailboxOwner && replyDraftId) {
    return `${mailboxOwner} · draft ${compactIdentifier(replyDraftId, 12)}`
  }
  if (mailboxOwner) {
    return mailboxOwner
  }
  if (threadId) {
    return `Thread ${compactIdentifier(threadId, 12)}`
  }
  if (replyDraftId) {
    return `Draft ${compactIdentifier(replyDraftId, 12)}`
  }
  if (requestId) {
    return `Request ${compactIdentifier(requestId, 12)}`
  }
  if (journeyKey) {
    return `Journey ${compactIdentifier(journeyKey, 12)}`
  }
  if (runId) {
    return `Run ${compactIdentifier(runId, 12)}`
  }
  if (jobId) {
    return `Job ${compactIdentifier(jobId, 12)}`
  }
  if (rootEntity) {
    return rootEntity
  }

  return undefined
}

export function formatRunLabel(journey: TraceJourney): string {
  return preferredRunIdentity(journey) ?? `Run ${journey.traceId.slice(0, 8)}…`
}

export function isDefaultVisibleJourney(journey: TraceJourney): boolean {
  if (journey.status === 'error') {
    return true
  }

  if (
    normalizeTraceIdentifierValue(journey.identifiers.threadId) ||
    normalizeTraceIdentifierValue(journey.identifiers.replyDraftId)
  ) {
    return true
  }

  return journey.steps.some((stage) => {
    const stepId = normalizeTraceIdentifierValue(stage.stepId)
    return isLifecycleTerminalStep(stepId)
  })
}

export function canonicalStepId(stage: Pick<TraceStep, 'nodeId' | 'stepId'>): string | undefined {
  const componentId = normalizeTraceIdentifierValue(stage.nodeId)
  const stepId = normalizeTraceIdentifierValue(stage.stepId)

  if (!componentId) {
    return stepId
  }
  if (!stepId) {
    return componentId
  }

  return `${componentId}.${stepLeaf(stepId)}`
}

export function formatStepLabel(stage: Pick<TraceStep, 'label' | 'nodeId' | 'stepId'>): string {
  const componentId = normalizeTraceIdentifierValue(stage.nodeId)
  const explicitLabel = normalizeTraceIdentifierValue(stage.label)
  const stepId = normalizeTraceIdentifierValue(stage.stepId)

  const componentLabel = componentId ? humanizeMachineLabel(componentId) : undefined
  const detailSource = explicitLabel && explicitLabel !== stepId ? explicitLabel : stepId ? stepLeaf(stepId) : undefined
  const detailLabel = detailSource ? humanizeMachineLabel(detailSource) : undefined

  if (componentLabel && detailLabel && componentLabel !== detailLabel) {
    return `${componentLabel} · ${detailLabel}`
  }

  return componentLabel ?? detailLabel ?? '-'
}

export function formatStepDisplayLabel(
  stage: Pick<TraceStep, 'label' | 'nodeId' | 'stepId' | 'attrs'>,
): string {
  const summary = summarizeStepOutcome({
    stepId: stage.stepId,
    nodeId: stage.nodeId,
    attributes: stage.attrs,
  })

  if (summary) {
    return summary
  }

  return formatStepLabel(stage)
}

export function getOverviewSteps(steps: TraceStep[]): TraceStep[] {
  const lifecycleSteps = steps.filter((stage) => {
    const tier = getStepPresentationTier({
      stepId: stage.stepId,
      nodeId: stage.nodeId,
      attributes: stage.attrs,
    })

    return tier === 'outcome' || tier === 'transition' || isLifecycleTerminalStep(stage.stepId)
  })

  if (lifecycleSteps.length > 0) {
    return lifecycleSteps
  }

  const filtered = steps.filter(
    (stage) =>
      !isGenericOperationalStep({
        stepId: stage.stepId,
        nodeId: stage.nodeId,
      }),
  )

  return filtered.length > 0 ? filtered : steps
}

export function getJourneySummaryStep(journey: TraceJourney): TraceStep | undefined {
  return getOverviewSteps(journey.steps).at(-1) ?? journey.steps.at(-1)
}
