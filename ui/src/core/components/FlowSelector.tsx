import type { FlowConfig } from '../types'

interface FlowSelectorProps {
  flows: FlowConfig[]
  currentFlowId: string
  connected: boolean
  reconnecting: boolean
  eventCount: number
  onSelectFlow: (flowId: string) => void
  onClearSession: () => void
}

export function FlowSelector({
  flows,
  currentFlowId,
  connected,
  reconnecting,
  eventCount,
  onSelectFlow,
  onClearSession,
}: FlowSelectorProps) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-700/50 bg-slate-900/95 px-4 py-2 backdrop-blur-sm">
      <div className="flex min-w-48 items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="flow-select">
          Flow
        </label>
        <select
          id="flow-select"
          value={currentFlowId}
          onChange={(event) => onSelectFlow(event.target.value)}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-100 outline-none focus:border-sky-400"
        >
          {flows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            connected ? 'bg-emerald-400' : reconnecting ? 'bg-amber-400 animate-flow-pulse' : 'bg-rose-500'
          }`}
        />
        <span className="text-xs text-slate-400">
          {connected ? 'Connected' : reconnecting ? 'Reconnecting…' : 'Disconnected'}
        </span>
      </div>

      <div className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{eventCount} events</div>

      <button
        type="button"
        onClick={onClearSession}
        className="ml-auto text-sm text-slate-400 hover:text-slate-200"
      >
        Clear session
      </button>
    </header>
  )
}
