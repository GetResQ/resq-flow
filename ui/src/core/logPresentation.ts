import type { LogEntry } from './types'
import { summarizeStepOutcome } from './stepOutcomePresentation'

interface FlowLogPresentationInput {
  stepId?: string
  nodeId?: string
  stepName?: string
  message: string
  retryable?: boolean
  errorClass?: string
  attributes?: Record<string, unknown>
}

function defaultDisplayMessage(stageLabel: string | undefined, message: string): string {
  if (!stageLabel) {
    return message
  }

  return `${stageLabel}: ${message}`
}

export function buildFlowLogDisplayMessage(input: FlowLogPresentationInput): string {
  const summary = summarizeStepOutcome(input)
  if (summary) {
    return summary
  }

  return defaultDisplayMessage(input.stepName ?? input.stepId, input.message)
}

export function getLogDisplayMessage(
  entry: Pick<LogEntry, 'displayMessage' | 'message' | 'stepId' | 'stepName'>,
): string {
  if (entry.displayMessage) {
    return entry.displayMessage
  }

  return defaultDisplayMessage(entry.stepName ?? entry.stepId, entry.message)
}

export function buildLogSearchText(
  entry: Pick<
    LogEntry,
    'displayMessage' | 'message' | 'stepId' | 'stepName' | 'componentId' | 'runId' | 'traceId' | 'nodeId'
  >,
  nodeLabel?: string,
): string {
  return [
    getLogDisplayMessage(entry),
    entry.message,
    nodeLabel,
    entry.nodeId,
    entry.stepName,
    entry.stepId,
    entry.componentId,
    entry.runId,
    entry.traceId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
