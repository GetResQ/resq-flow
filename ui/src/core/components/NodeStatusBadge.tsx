import clsx from 'clsx'

import { Badge } from '@/components/ui'

import type { NodeStatus } from '../types'
import { DurationBadge } from './DurationBadge'

interface NodeStatusBadgeProps {
  status: NodeStatus
  durationMs?: number
  durationVisibleUntil?: number
  className?: string
}

function badgeVariant(status: NodeStatus) {
  if (status === 'success') {
    return 'success'
  }
  if (status === 'error') {
    return 'destructive'
  }
  if (status === 'active') {
    return 'default'
  }
  return 'outline'
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
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <Badge
        data-testid={`status-badge-${status}`}
        variant={badgeVariant(status)}
        className="gap-1.5 px-2.5 py-0.5 capitalize"
      >
        <span
          className={clsx(
            'size-2 rounded-full bg-current',
            status === 'active' && 'animate-flow-pulse',
          )}
        />
        <span>{status}</span>
      </Badge>
      <DurationBadge durationMs={durationMs} faded={faded} />
    </div>
  )
}
