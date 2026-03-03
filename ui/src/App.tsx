import { useCallback, useEffect, useMemo, useState } from 'react'

import { FlowCanvas } from './core/components/FlowCanvas'
import { FlowSelector } from './core/components/FlowSelector'
import { LogPanel } from './core/components/LogPanel'
import { NodeDetailPanel } from './core/components/NodeDetailPanel'
import { useFlowAnimations } from './core/hooks/useFlowAnimations'
import { useLogStream } from './core/hooks/useLogStream'
import { useRelayConnection } from './core/hooks/useRelayConnection'
import { useTraceTimeline } from './core/hooks/useTraceTimeline'
import { flows } from './flows'

function App() {
  const [flowId, setFlowId] = useState(flows[0].id)
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>()

  const relay = useRelayConnection()

  const currentFlow = useMemo(
    () => flows.find((flow) => flow.id === flowId) ?? flows[0],
    [flowId],
  )

  const animations = useFlowAnimations({
    events: relay.events,
    spanMapping: currentFlow.spanMapping,
    edges: currentFlow.edges,
  })
  const logStream = useLogStream(relay.events, currentFlow.spanMapping)
  const traceTimeline = useTraceTimeline(relay.events, currentFlow.spanMapping)

  const clearAll = useCallback(() => {
    relay.clearEvents()
    animations.clearStatuses()
    logStream.clearSession()
    traceTimeline.clearTraces()
    setSelectedNodeId(undefined)
  }, [animations.clearStatuses, logStream.clearSession, relay.clearEvents, traceTimeline.clearTraces])

  useEffect(() => {
    clearAll()
  }, [flowId, clearAll])

  const selectedNode = currentFlow.nodes.find((node) => node.id === selectedNodeId) ?? null

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <FlowSelector
        flows={flows}
        currentFlowId={flowId}
        connected={relay.connected}
        reconnecting={relay.reconnecting}
        eventCount={relay.events.length}
        onSelectFlow={setFlowId}
        onClearSession={clearAll}
      />

      <main className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          <FlowCanvas
            flow={currentFlow}
            nodeStatuses={animations.nodeStatuses}
            activeEdges={animations.activeEdges}
            nodeLogMap={logStream.nodeLogMap}
            nodeSpans={traceTimeline.nodeSpans}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        <LogPanel
          flow={currentFlow}
          globalLogs={logStream.globalLogs}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />

        <NodeDetailPanel
          node={selectedNode}
          status={selectedNodeId ? animations.nodeStatuses.get(selectedNodeId) : undefined}
          logs={selectedNodeId ? logStream.nodeLogMap.get(selectedNodeId) ?? [] : []}
          spans={selectedNodeId ? traceTimeline.nodeSpans.get(selectedNodeId) ?? [] : []}
          onClose={() => setSelectedNodeId(undefined)}
        />
      </main>
    </div>
  )
}

export default App
