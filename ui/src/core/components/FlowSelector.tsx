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
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 bg-slate-950/90 px-4 py-3">
      <div className="flex min-w-48 items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-300" htmlFor="flow-select">
          Flow
        </label>
        <select
          id="flow-select"
          value={currentFlowId}
          onChange={(event) => onSelectFlow(event.target.value)}
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-400"
        >
          {flows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-200">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            connected ? 'bg-emerald-400' : reconnecting ? 'bg-amber-400 animate-flow-pulse' : 'bg-rose-500'
          }`}
        />
        <span>{connected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected'}</span>
      </div>

      <div className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">{eventCount} events</div>

      <button
        type="button"
        onClick={onClearSession}
        className="ml-auto rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-sky-400 hover:text-sky-300"
      >
        Clear session
      </button>
    </header>
  )
}
