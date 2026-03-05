import { useMemo, useState } from 'react'

import type { TraceJourney, TraceStage, TraceStatus } from '../types'
import { DurationBadge } from './DurationBadge'

type TabKey = 'timeline' | 'attributes'

interface TraceDetailPanelProps {
  journey: TraceJourney
  onClose: () => void
}

function statusClass(status: TraceStatus): string {
  if (status === 'error') {
    return 'bg-rose-500/20 text-rose-200 border-rose-500/40'
  }
  if (status === 'success') {
    return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
  }
  if (status === 'partial') {
    return 'bg-amber-500/20 text-amber-200 border-amber-500/40'
  }
  return 'bg-sky-500/20 text-sky-200 border-sky-500/40'
}

function stageErrorSummary(stage: TraceStage): string | undefined {
  const attrs = stage.attrs
  const errorMessage = typeof attrs?.error_message === 'string' ? attrs.error_message : undefined
  const errorClass = typeof attrs?.error_class === 'string' ? attrs.error_class : undefined
  const errorCode = typeof attrs?.error_code === 'string' ? attrs.error_code : undefined
  const retryable = typeof attrs?.retryable === 'boolean' ? attrs.retryable : undefined

  if (errorMessage) {
    return errorMessage
  }

  if (errorClass && errorCode) {
    return retryable === undefined ? `${errorClass}:${errorCode}` : `${errorClass}:${errorCode} retryable=${retryable}`
  }

  if (errorClass || errorCode) {
    return [errorClass, errorCode].filter(Boolean).join(':')
  }

  return stage.errorSummary
}

export function TraceDetailPanel({ journey, onClose }: TraceDetailPanelProps) {
  const [tab, setTab] = useState<TabKey>('timeline')
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>(journey.stages[0]?.stageId)

  const selectedStage = useMemo(
    () => journey.stages.find((stage) => stage.stageId === selectedStageId) ?? journey.stages[0],
    [journey.stages, selectedStageId],
  )

  const identifierEntries = useMemo(
    () =>
      [
        ['mailbox_owner', journey.identifiers.mailboxOwner],
        ['provider', journey.identifiers.provider],
        ['thread_id', journey.identifiers.threadId],
        ['reply_draft_id', journey.identifiers.replyDraftId],
        ['job_id', journey.identifiers.jobId],
        ['request_id', journey.identifiers.requestId],
        ['content_hash', journey.identifiers.contentHash],
        ['journey_key', journey.identifiers.journeyKey],
      ].filter((entry): entry is [string, string] => Boolean(entry[1])),
    [journey.identifiers],
  )

  return (
    <aside
      className="flex w-[380px] flex-col border-l border-slate-700/50 bg-slate-900"
      style={{ transition: 'transform 200ms ease', transform: 'translateX(0)' }}
    >
      <header className="border-b border-slate-700/50 px-4 py-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Trace {journey.traceId.slice(0, 16)}…</h2>
            <p className="text-xs text-slate-500">
              {journey.eventCount} events · {journey.stages.length} stages
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-200">
            close
          </button>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded border px-2 py-0.5 text-[10px] uppercase ${statusClass(journey.status)}`}>
            {journey.status}
          </span>
          <DurationBadge durationMs={journey.durationMs} />
        </div>

        <div className="flex flex-wrap gap-1">
          {identifierEntries.length === 0 ? (
            <span className="text-[10px] text-slate-500">No key IDs on this trace.</span>
          ) : (
            identifierEntries.map(([label, value]) => (
              <span key={label} className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                {label}: {value}
              </span>
            ))
          )}
        </div>
      </header>

      <div className="flex border-b border-slate-700/50 px-2 py-2">
        {(['timeline', 'attributes'] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`rounded px-3 py-1 text-xs uppercase ${
              tab === tabKey ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {tabKey}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === 'timeline' ? (
          <div className="space-y-2">
            {journey.stages.map((stage, index) => {
              const errorSummary = stageErrorSummary(stage)
              const isSelected = selectedStage?.stageId === stage.stageId
              return (
                <button
                  key={`${stage.stageId}-${index}`}
                  type="button"
                  onClick={() => setSelectedStageId(stage.stageId)}
                  className={`w-full rounded border p-2 text-left ${
                    isSelected ? 'border-sky-500/60 bg-sky-900/15' : 'border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-slate-100">{stage.label}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${statusClass(stage.status)}`}>
                      {stage.status}
                    </span>
                    <DurationBadge durationMs={stage.durationMs} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                    <span>seq {stage.startSeq} → {stage.endSeq}</span>
                    {typeof stage.attempt === 'number' ? <span>attempt {stage.attempt}</span> : null}
                    {stage.nodeId ? <span>node {stage.nodeId}</span> : null}
                  </div>
                  {errorSummary ? (
                    <div className="mt-1 rounded border border-rose-500/30 bg-rose-900/20 px-2 py-1 text-[10px] text-rose-200">
                      {errorSummary}
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}

        {tab === 'attributes' ? (
          <pre className="overflow-x-auto rounded border border-slate-700 bg-slate-900/70 p-3 text-[11px] text-slate-200">
            {JSON.stringify(selectedStage?.attrs ?? {}, null, 2)}
          </pre>
        ) : null}
      </div>
    </aside>
  )
}

