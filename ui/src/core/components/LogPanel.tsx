import { useEffect, useMemo, useRef, useState } from 'react'

import { DurationBadge } from './DurationBadge'
import type { FlowConfig, LogEntry } from '../types'

interface LogPanelProps {
  flow: FlowConfig
  globalLogs: LogEntry[]
  selectedNodeId?: string
  onSelectNode: (nodeId: string) => void
}

export function LogPanel({ flow, globalLogs, selectedNodeId, onSelectNode }: LogPanelProps) {
  const [open, setOpen] = useState(true)
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'error'>('all')
  const [search, setSearch] = useState('')
  const [nodeFilter, setNodeFilter] = useState<string | 'all'>('all')
  const [liveTail, setLiveTail] = useState(true)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selectedNodeId) {
      setNodeFilter(selectedNodeId)
    }
  }, [selectedNodeId])

  const nodeLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of flow.nodes) {
      map.set(node.id, node.label)
    }
    return map
  }, [flow.nodes])

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...globalLogs]
      .filter((entry) => {
        if (levelFilter !== 'all' && entry.level !== levelFilter) {
          return false
        }

        if (nodeFilter !== 'all' && entry.nodeId !== nodeFilter) {
          return false
        }

        if (!query) {
          return true
        }

        return (
          entry.message.toLowerCase().includes(query) ||
          (entry.nodeId ? nodeLabels.get(entry.nodeId)?.toLowerCase().includes(query) : false)
        )
      })
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
  }, [globalLogs, levelFilter, nodeFilter, nodeLabels, search])

  useEffect(() => {
    if (!open || !liveTail) {
      return
    }

    const list = listRef.current
    if (!list) {
      return
    }

    list.scrollTop = 0
  }, [filteredLogs, liveTail, open])

  if (!open) {
    return (
      <aside className="w-14 border-l border-slate-700/60 bg-slate-950/85 p-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200"
        >
          Logs
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex w-[340px] flex-col border-l border-slate-700/60 bg-slate-950/85">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-200">Live logs</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          collapse
        </button>
      </div>

      <div className="space-y-2 border-b border-slate-700/50 px-3 py-2">
        <input
          placeholder="Search logs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-400"
        />

        <div className="flex gap-1">
          {(['all', 'info', 'error'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setLevelFilter(level)}
              className={`rounded px-2 py-1 text-[10px] uppercase ${
                levelFilter === level
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <select
          value={nodeFilter}
          onChange={(event) => setNodeFilter(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-400"
        >
          <option value="all">All nodes</option>
          {flow.nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={listRef}
        onScroll={(event) => {
          const target = event.currentTarget
          setLiveTail(target.scrollTop < 12)
        }}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-2"
      >
        {filteredLogs.map((entry, index) => {
          const nodeLabel = entry.nodeId ? nodeLabels.get(entry.nodeId) ?? entry.nodeId : 'unmapped'
          const timestamp = new Date(entry.timestamp).toLocaleTimeString()

          return (
            <button
              key={`${entry.timestamp}-${entry.message}-${index}`}
              type="button"
              onClick={() => entry.nodeId && onSelectNode(entry.nodeId)}
              className="w-full rounded border border-slate-700/70 bg-slate-900/70 p-2 text-left text-[11px] hover:border-sky-500/60"
            >
              <div className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
                <span>{timestamp}</span>
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-200">{nodeLabel}</span>
                <span className={entry.level === 'error' ? 'text-rose-300' : 'text-emerald-300'}>
                  {entry.level === 'error' ? 'ERR' : 'OK'}
                </span>
                <DurationBadge className="ml-auto" durationMs={entry.durationMs} />
              </div>
              <p className="truncate text-slate-100">{entry.message}</p>
            </button>
          )
        })}
      </div>

      {!liveTail ? (
        <button
          type="button"
          onClick={() => {
            setLiveTail(true)
            if (listRef.current) {
              listRef.current.scrollTop = 0
            }
          }}
          className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
        >
          Live tail paused. Click to resume.
        </button>
      ) : null}
    </aside>
  )
}
