import { readStringAttribute } from './mapping'

export interface StepOutcomeInput {
  stepId?: string
  nodeId?: string
  message?: string
  retryable?: boolean
  errorClass?: string
  attributes?: Record<string, unknown>
}

export type StepPresentationTier = 'outcome' | 'transition' | 'plumbing' | 'fallback'

const TRANSITION_SUMMARIES: Record<string, string> = {
  'actions.send_enqueue': 'send queued',
  'analyze.draft_insert': 'draft created',
  'extract.recompute_enqueue': 'recompute queued',
  'recompute.started': 'recompute started',
}

const PLUMBING_STEP_IDS = new Set([
  'analyze.reply_status_write',
  'analyze.draft_status_write',
  'extract.state_write',
  'extract.upsert_contacts',
  'incoming.write_metadata',
  'incoming.write_threads',
  'incoming.cursor_update',
  'scheduler.cursor_update',
  'queue.enqueue',
  'worker.pickup',
  'worker.result',
  'send.precheck',
  'send.provider_call',
  'send.finalize',
])

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

function summarizeAnalyzeFinalResult(input: StepOutcomeInput): string | undefined {
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

function summarizeSendFinalResult(input: StepOutcomeInput): string | undefined {
  const replyStatus = readNormalizedAttribute(input.attributes, 'reply_status')
  const draftStatus = readNormalizedAttribute(input.attributes, 'draft_status')
  const resultAction = readNormalizedAttribute(input.attributes, 'result_action')
  const errorClass =
    normalize(input.errorClass) ?? readNormalizedAttribute(input.attributes, 'error_class')
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

function summarizeLifecycleOutcome(input: StepOutcomeInput): string | undefined {
  const stepId = normalize(input.stepId)

  if (!stepId) {
    return undefined
  }

  if (stepId === 'analyze.final_result') {
    return summarizeAnalyzeFinalResult(input)
  }

  if (stepId === 'send.final_result') {
    return summarizeSendFinalResult(input)
  }

  if (stepId === 'extract.final_result') {
    return 'extract completed'
  }

  if (stepId === 'recompute.final_result') {
    return 'recompute finished'
  }

  return undefined
}

function summarizeLifecycleTransition(input: StepOutcomeInput): string | undefined {
  const stepId = normalize(input.stepId)
  if (!stepId) {
    return undefined
  }

  return TRANSITION_SUMMARIES[stepId]
}

function isNodeWrapperStep(input: StepOutcomeInput): boolean {
  const stepId = normalize(input.stepId)
  const nodeId = normalize(input.nodeId)

  if (!stepId) {
    return Boolean(nodeId)
  }

  if (!nodeId) {
    return false
  }

  if (stepId === nodeId) {
    return true
  }

  const stepLeaf = stepId.split('.').at(-1)
  const nodeLeaf = nodeId.split('.').at(-1)
  return Boolean(stepLeaf && nodeLeaf && stepLeaf === nodeLeaf)
}

export function summarizeStepOutcome(input: StepOutcomeInput): string | undefined {
  return summarizeLifecycleOutcome(input) ?? summarizeLifecycleTransition(input)
}

export function getStepPresentationTier(input: StepOutcomeInput): StepPresentationTier {
  if (summarizeLifecycleOutcome(input)) {
    return 'outcome'
  }

  if (summarizeLifecycleTransition(input)) {
    return 'transition'
  }

  const stepId = normalize(input.stepId)
  if ((stepId && PLUMBING_STEP_IDS.has(stepId)) || isNodeWrapperStep(input)) {
    return 'plumbing'
  }

  return 'fallback'
}

export function isLifecycleTerminalStep(stepId?: string): boolean {
  const normalized = normalize(stepId)
  return Boolean(normalized?.endsWith('final_result'))
}

export function isGenericOperationalStep(input: Pick<StepOutcomeInput, 'stepId' | 'nodeId'>): boolean {
  return getStepPresentationTier(input) === 'plumbing'
}
