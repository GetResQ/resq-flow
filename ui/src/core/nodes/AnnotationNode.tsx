import type { NodeProps } from '@xyflow/react'

import type { FlowNode } from './types'

export function AnnotationNode({ data }: NodeProps<FlowNode>) {
  return (
    <div className="max-w-sm whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300/85">
      {data.label}
    </div>
  )
}
