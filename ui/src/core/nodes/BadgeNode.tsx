import type { NodeProps } from '@xyflow/react'

import { NodeStatusBadge } from '../components/NodeStatusBadge'
import { nodeContainerClass, renderHandles } from './nodePrimitives'
import type { FlowNode } from './types'

const defaultHandles = [
  { position: 'top', type: 'target' },
  { position: 'bottom', type: 'source' },
] as const

export function BadgeNode({ id, data }: NodeProps<FlowNode>) {
  const status = data.status?.status ?? 'idle'

  return (
    <div
      className={`${nodeContainerClass({
        color: data.style?.color,
        status,
        borderStyle: data.style?.borderStyle,
      })} relative rounded-md px-2.5 py-1.5`}
    >
      {renderHandles(id, data.handles, [...defaultHandles])}
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold leading-tight">{data.label}</p>
        <NodeStatusBadge status={status} />
      </div>
    </div>
  )
}
