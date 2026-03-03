import type { NodeTypes } from '@xyflow/react'

import { AnnotationNode } from './AnnotationNode'
import { BadgeNode } from './BadgeNode'
import { CircleNode } from './CircleNode'
import { DiamondNode } from './DiamondNode'
import { GroupNode } from './GroupNode'
import { OctagonNode } from './OctagonNode'
import { PillNode } from './PillNode'
import { RectangleNode } from './RectangleNode'
import { RoundedRectNode } from './RoundedRectNode'

export const nodeTypes: NodeTypes = {
  rectangle: RectangleNode,
  roundedRect: RoundedRectNode,
  diamond: DiamondNode,
  circle: CircleNode,
  pill: PillNode,
  badge: BadgeNode,
  octagon: OctagonNode,
  group: GroupNode,
  annotation: AnnotationNode,
}
