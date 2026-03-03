import type { EdgeTypes } from '@xyflow/react'

import { AnimatedEdge } from './AnimatedEdge'
import { DashedEdge } from './DashedEdge'

export const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
  dashed: DashedEdge,
}
