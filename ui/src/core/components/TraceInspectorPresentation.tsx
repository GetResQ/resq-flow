import type { ReactNode } from 'react'

import { Badge } from '@/components/ui'

import { formatEasternTime } from '../time'
import type { FlowEdgeConfig, FlowNodeConfig, TraceJourney, TraceStatus } from '../types'
import { getJourneyOverviewModel } from '../runPresentation'
import { DurationBadge } from './DurationBadge'

function journeyStatusVariant(status: TraceStatus): 'default' | 'destructive' | 'success' | 'warning' {
  if (status === 'error') {
    return 'destructive'
  }
  if (status === 'success') {
    return 'success'
  }
  if (status === 'partial') {
    return 'warning'
  }
  return 'default'
}

export function getTraceInspectorPresentation(
  journey: TraceJourney,
  flowNodes?: FlowNodeConfig[],
  flowEdges?: FlowEdgeConfig[],
): {
  title: string
  description: ReactNode
  headerContent: ReactNode
} {
  const overview = getJourneyOverviewModel(journey, flowNodes, flowEdges)
  const storyStageCount = overview.cards.length

  return {
    title: 'Run',
    description: (
      <>
        {storyStageCount} {storyStageCount === 1 ? 'story stage' : 'story stages'} · updated{' '}
        <span className="font-mono">{formatEasternTime(journey.lastUpdatedAt)}</span>
      </>
    ),
    headerContent: (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={journeyStatusVariant(journey.status)}>{journey.status}</Badge>
        <DurationBadge durationMs={journey.durationMs} />
      </div>
    ),
  }
}
