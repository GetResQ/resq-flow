import type { ReactNode } from 'react'

import { Badge } from '@/components/ui'

import { formatEasternTime } from '../time'
import type { TraceJourney, TraceStatus } from '../types'
import { getOverviewSteps } from '../runPresentation'
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

export function getTraceInspectorPresentation(journey: TraceJourney): {
  title: string
  description: ReactNode
  headerContent: ReactNode
} {
  const overviewSteps = getOverviewSteps(journey.steps)
  const lifecycleStepCount = overviewSteps.length

  return {
    title: 'Run',
    description: (
      <>
        {lifecycleStepCount} {lifecycleStepCount === 1 ? 'lifecycle step' : 'lifecycle steps'} · updated{' '}
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
