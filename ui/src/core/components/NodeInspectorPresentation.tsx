import type { ReactNode } from 'react'

import { NodeStatusBadge } from './NodeStatusBadge'
import type { FlowNodeConfig } from '../types'
import type { NodeDetailStatus } from './NodeDetailPanel'

function resolveNodeRole(node: FlowNodeConfig): string | null {
  if (node.style?.icon === 'worker') {
    return 'Worker'
  }
  if (node.style?.icon === 'queue') {
    return 'Queue'
  }
  if (node.style?.icon === 'cron') {
    return 'Scheduler'
  }
  if (node.type === 'diamond') {
    return 'Decision'
  }
  if (node.type === 'cylinder') {
    return 'Store'
  }
  if (node.type === 'badge') {
    return 'Step'
  }

  const sublabel = node.sublabel?.trim()
  if (!sublabel) {
    return null
  }

  if (sublabel.toLowerCase() === 'workers') {
    return 'Worker'
  }

  return sublabel.replace(/^\(/, '').replace(/\)$/, '')
}

export function getNodeInspectorPresentation(node: FlowNodeConfig, status?: NodeDetailStatus): {
  title: string
  description: string
  headerContent: ReactNode
} {
  const roleLabel = resolveNodeRole(node)

  return {
    title: node.label,
    description: roleLabel ?? 'Node details and recent activity.',
    headerContent: (
      <>
        <div className="flex items-center gap-2">
          <NodeStatusBadge status={status?.status ?? 'idle'} />
        </div>
        {node.description ? <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{node.description}</p> : null}
      </>
    ),
  }
}
