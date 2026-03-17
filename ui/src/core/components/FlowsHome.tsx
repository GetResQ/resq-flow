import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui'

import { flows } from '../../flows'
import { useLayoutStore } from '../../stores/layout'
import { getMockFlowMetrics, type FlowMetricsSnapshot } from '../mockMetrics'
import type { FlowConfig } from '../types'
import { FlowHealthCard } from './FlowHealthCard'

interface FlowsHomeProps {
  registeredFlows?: FlowConfig[]
  initialMetrics?: FlowMetricsSnapshot[]
}

export function FlowsHome({
  registeredFlows = flows,
  initialMetrics,
}: FlowsHomeProps) {
  const navigate = useNavigate()
  const setCommandPaletteOpen = useLayoutStore((state) => state.setCommandPaletteOpen)

  const { data: metrics = initialMetrics ?? [] } = useQuery({
    queryKey: ['flows-home', registeredFlows.map((flow) => flow.id)],
    queryFn: async () => {
      // TODO: wire to useQuery when relay endpoint exists
      return initialMetrics ?? getMockFlowMetrics(registeredFlows)
    },
    initialData: initialMetrics,
  })

  const metricMap = new Map(metrics.map((entry) => [entry.flowId, entry]))

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Flows</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Health, throughput, and recent run quality across every registered flow.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setCommandPaletteOpen(true)}>
            Cmd+K
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {registeredFlows.map((flow) => (
            <FlowHealthCard
              key={flow.id}
              flow={flow}
              metrics={metricMap.get(flow.id) ?? getMockFlowMetrics([flow])[0]}
              onSelect={(flowId) => navigate(`/flows/${flowId}?mode=live`)}
            />
          ))}
        </section>
      </div>
    </main>
  )
}
