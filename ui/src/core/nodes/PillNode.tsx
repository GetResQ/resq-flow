import type { NodeProps } from '@xyflow/react'

import { NodeStatusBadge } from '../components/NodeStatusBadge'
import { nodeContainerClass, renderHandles } from './nodePrimitives'
import type { FlowNode } from './types'

const defaultHandles = [{ position: 'right', type: 'source' }] as const

export function PillNode({ id, data }: NodeProps<FlowNode>) {
  const status = data.status?.status ?? 'idle'

  return (
    <div
      className={`${nodeContainerClass({
        color: data.style?.color,
        status,
        borderStyle: data.style?.borderStyle,
      })} relative rounded-full px-4 py-2`}
    >
      {renderHandles(id, data.handles, [...defaultHandles])}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold leading-none">{data.label}</p>
        <NodeStatusBadge
          status={status}
          durationMs={data.status?.durationMs}
          durationVisibleUntil={data.status?.durationVisibleUntil}
        />
      </div>
    </div>
  )
}
