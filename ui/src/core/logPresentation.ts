import { readStringAttribute } from './mapping'
import type { LogEntry } from './types'

interface FlowLogPresentationInput {
  stageId?: string
  stageName?: string
  message: string
  retryable?: boolean
  errorClass?: string
  attributes?: Record<string, unknown>
}

function normalize(value?: string | null): string | undefined {
  const trimmed = value?.trim().toLowerCase()
  return trimmed ? trimmed : undefined
}

function readNormalizedAttribute(
  attributes: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  return normalize(readStringAttribute(attributes, key))
}

function defaultDisplayMessage(stageLabel: string | undefined, message: string): string {
  if (!stageLabel) {
    return message
  }

  return `${stageLabel}: ${message}`
}

function summarizeAnalyzeFinalResult(input: FlowLogPresentationInput): string | undefined {
  const replyStatus = readNormalizedAttribute(input.attributes, 'reply_status')
  const draftStatus = readNormalizedAttribute(input.attributes, 'draft_status')
  const resultAction = readNormalizedAttribute(input.attributes, 'result_action')
  const autoApproved = readNormalizedAttribute(input.attributes, 'auto_approved') === 'true'

  if (replyStatus === 'skipped' || resultAction === 'skip') {
    return 'skipped'
  }

  if (autoApproved || replyStatus === 'executing_actions') {
    return 'auto-send approved; execution enqueued'
  }

  if (draftStatus === 'approval_pending' || replyStatus === 'pending_action_approval') {
    return 'drafted; awaiting manual approval'
  }

  if (
    draftStatus === 'needs_review' ||
    replyStatus === 'needs_review' ||
    resultAction === 'needs_review'
  ) {
    return 'drafted; awaiting manual review'
  }

  if (resultAction === 'draft_reply') {
    return 'drafted'
  }

  return undefined
}

function summarizeSendFinalResult(input: FlowLogPresentationInput): string | undefined {
  const replyStatus = readNormalizedAttribute(input.attributes, 'reply_status')
  const draftStatus = readNormalizedAttribute(input.attributes, 'draft_status')
  const resultAction = readNormalizedAttribute(input.attributes, 'result_action')
  const errorClass = normalize(input.errorClass) ?? readNormalizedAttribute(input.attributes, 'error_class')
  const errorMessage =
    readNormalizedAttribute(input.attributes, 'error_message') ?? normalize(input.message)
  const retryable =
    input.retryable === true ||
    readNormalizedAttribute(input.attributes, 'retryable') === 'true' ||
    errorClass === 'retryable' ||
    Boolean(errorMessage?.includes('retryable'))

  if (resultAction === 'sent' || replyStatus === 'sent' || draftStatus === 'sent') {
    return 'sent'
  }

  if (draftStatus === 'approval_pending' || replyStatus === 'pending_action_approval') {
    return 'awaiting manual approval'
  }

  if (retryable) {
    return 'retryable send failure'
  }

  if (
    errorClass === 'terminal' ||
    replyStatus === 'send_failed' ||
    replyStatus === 'stale' ||
    draftStatus === 'send_failed'
  ) {
    return 'terminal send failure'
  }

  return undefined
}

function summarizeStage(input: FlowLogPresentationInput): string | undefined {
  const stageId = normalize(input.stageId)

  if (!stageId) {
    return undefined
  }

  if (stageId === 'analyze.final_result') {
    return summarizeAnalyzeFinalResult(input)
  }

  if (stageId === 'actions.send_enqueue') {
    return 'send queued'
  }

  if (stageId === 'send.final_result') {
    return summarizeSendFinalResult(input)
  }

  return undefined
}

export function buildFlowLogDisplayMessage(input: FlowLogPresentationInput): string {
  const summary = summarizeStage(input)
  if (summary) {
    return summary
  }

  return defaultDisplayMessage(input.stageName ?? input.stageId, input.message)
}

export function getLogDisplayMessage(
  entry: Pick<LogEntry, 'displayMessage' | 'message' | 'stageId' | 'stageName'>,
): string {
  if (entry.displayMessage) {
    return entry.displayMessage
  }

  return defaultDisplayMessage(entry.stageName ?? entry.stageId, entry.message)
}

export function buildLogSearchText(
  entry: Pick<
    LogEntry,
    'displayMessage' | 'message' | 'stageId' | 'stageName' | 'componentId' | 'runId' | 'traceId' | 'nodeId'
  >,
  nodeLabel?: string,
): string {
  return [
    getLogDisplayMessage(entry),
    entry.message,
    nodeLabel,
    entry.nodeId,
    entry.stageName,
    entry.stageId,
    entry.componentId,
    entry.runId,
    entry.traceId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
