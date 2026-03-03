import { useMemo, useState } from 'react'

import { DurationBadge } from './DurationBadge'
import { NodeStatusBadge } from './NodeStatusBadge'
import type { FlowNodeConfig, LogEntry, SpanEntry } from '../types'

interface NodeDetailPanelProps {
  node: FlowNodeConfig | null
  status?: {
    status: 'idle' | 'active' | 'success' | 'error'
    durationMs?: number
    durationVisibleUntil?: number
  }
  logs: LogEntry[]
  spans: SpanEntry[]
  onClose: () => void
}

type TabKey = 'traces' | 'attributes'

function computeDepthMap(spans: SpanEntry[]): Map<string, number> {
  const depth = new Map<string, number>()

  const findDepth = (span: SpanEntry): number => {
    const cached = depth.get(span.spanId)
    if (typeof cached === 'number') {
      return cached
    }

    if (!span.parentSpanId) {
      depth.set(span.spanId, 0)
      return 0
    }

    const parent = spans.find((candidate) => candidate.spanId === span.parentSpanId)
    if (!parent) {
      depth.set(span.spanId, 0)
      return 0
    }

    const resolved = findDepth(parent) + 1
    depth.set(span.spanId, resolved)
    return resolved
  }

  for (const span of spans) {
    findDepth(span)
  }

  return depth
}

export function NodeDetailPanel({ node, status, logs, spans, onClose }: NodeDetailPanelProps) {
  const [tab, setTab] = useState<TabKey>('traces')

  const tracesByTraceId = useMemo(() => {
    const grouped = new Map<string, SpanEntry[]>()
    for (const span of spans) {
      const list = grouped.get(span.traceId) ?? []
      list.push(span)
      grouped.set(span.traceId, list)
    }

    for (const [traceId, list] of grouped.entries()) {
      grouped.set(
        traceId,
        [...list].sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime)),
      )
    }

    return [...grouped.entries()].slice(-5).reverse()
  }, [spans])

  const lastAttributes = [...logs]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]?.attributes

  if (!node) {
    return null
  }

  return (
    <aside
      className="flex w-[340px] flex-col border-l border-slate-700/50 bg-slate-900"
      style={{ transition: 'transform 200ms ease', transform: 'translateX(0)' }}
    >
      <header className="border-b border-slate-700/50 px-4 py-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{node.label}</h2>
            <p className="text-xs text-slate-500">{logs.length} events</p>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-200">
            close
          </button>
        </div>

        <div className="flex items-center gap-2">
          <NodeStatusBadge
            status={status?.status ?? 'idle'}
            durationMs={status?.durationMs}
            durationVisibleUntil={status?.durationVisibleUntil}
          />
          <DurationBadge durationMs={status?.durationMs} />
        </div>
      </header>

      <div className="flex border-b border-slate-700/50 px-2 py-2">
        {(['traces', 'attributes'] as const).map((tabKey) => (
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
        {tab === 'traces' ? (
          <div className="space-y-3">
            {tracesByTraceId.length === 0 ? (
              <p className="text-xs text-slate-500">No traces yet.</p>
            ) : (
              tracesByTraceId.map(([traceId, traceSpans]) => {
                const maxDuration = Math.max(...traceSpans.map((span) => span.durationMs ?? 1), 1)
                const depthMap = computeDepthMap(traceSpans)

                return (
                  <details key={traceId} className="rounded border border-slate-700 bg-slate-900/50 p-2" open>
                    <summary className="cursor-pointer text-xs text-slate-200">
                      trace: {traceId.slice(0, 12)}…
                    </summary>

                    <div className="mt-2 space-y-2">
                      {traceSpans.map((span) => {
                        const depth = depthMap.get(span.spanId) ?? 0
                        const widthPercent = Math.max(((span.durationMs ?? 1) / maxDuration) * 100, 8)

                        return (
                          <div key={span.spanId} style={{ marginLeft: `${depth * 14}px` }}>
                            <div className="mb-1 flex items-center gap-2 text-[10px] text-slate-300">
                              <span>{span.spanName}</span>
                              <DurationBadge durationMs={span.durationMs} />
                            </div>
                            <div className="h-2 rounded bg-slate-800">
                              <div
                                className={`h-2 rounded ${span.status === 'error' ? 'bg-rose-500/70' : 'bg-sky-500/70'}`}
                                style={{ width: `${widthPercent}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                )
              })
            )}
          </div>
        ) : null}

        {tab === 'attributes' ? (
          <pre className="overflow-x-auto rounded border border-slate-700 bg-slate-900/70 p-3 text-[11px] text-slate-200">
            {JSON.stringify(lastAttributes ?? {}, null, 2)}
          </pre>
        ) : null}
      </div>
    </aside>
  )
}
