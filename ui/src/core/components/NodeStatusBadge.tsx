import clsx from 'clsx'

import type { NodeStatus } from '../types'
import { DurationBadge } from './DurationBadge'

interface NodeStatusBadgeProps {
  status: NodeStatus
  durationMs?: number
  durationVisibleUntil?: number
  className?: string
}

export function NodeStatusBadge({
  status,
  durationMs,
  durationVisibleUntil,
  className,
}: NodeStatusBadgeProps) {
  const now = Date.now()
  const faded = Boolean(durationVisibleUntil && now > durationVisibleUntil)

  return (
    <div className={clsx('inline-flex items-center gap-1.5', className)}>
      <span
        data-testid={`status-badge-${status}`}
        className={clsx(
          'h-2.5 w-2.5 rounded-full ring-1 ring-white/25',
          status === 'idle' && 'bg-slate-500',
          status === 'active' && 'bg-sky-400 animate-flow-pulse',
          status === 'success' && 'bg-emerald-400',
          status === 'error' && 'bg-rose-500',
        )}
      />
      <DurationBadge durationMs={durationMs} faded={faded} />
    </div>
  )
}
