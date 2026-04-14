import { NodeResizer, type NodeProps } from '@xyflow/react'

import { renderHandles } from './nodePrimitives'
import type { FlowNode } from './types'

const defaultHandles = [] as const

export function GroupNode({ id, data, selected }: NodeProps<FlowNode>) {
  return (
    <div className="h-full w-full">
      {renderHandles(id, data.handles, [...defaultHandles])}
      {data.resizable ? (
        <NodeResizer
          isVisible={selected}
          minWidth={data.minSize?.width ?? 480}
          minHeight={data.minSize?.height ?? 360}
          lineClassName="!border-[var(--accent-primary)]/70"
          handleClassName="!h-2.5 !w-2.5 !rounded-md !border !border-[var(--border-default)] !bg-[var(--accent-primary)]"
        />
      ) : null}
    </div>
  )
}
