import type { ReactNode } from 'react'

import { formatEasternTime } from '../time'
import type { LogEntry } from '../types'
import { DurationBadge } from './DurationBadge'

export function getEventInspectorPresentation(entry: LogEntry, nodeLabel?: string): {
  title: string
  description: ReactNode
  headerContent: ReactNode
} {
  const timestamp = formatEasternTime(entry.timestamp, { precise: true })

  return {
    title: nodeLabel ?? entry.nodeId ?? 'Event',
    description: (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono">{timestamp}</span>
        <DurationBadge durationMs={entry.durationMs} />
      </span>
    ),
    headerContent: null,
  }
}
