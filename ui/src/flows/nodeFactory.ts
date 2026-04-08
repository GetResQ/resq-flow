import type { FlowNodeConfig, NodeSemanticRole, NodeShape, NodeStyle } from '../core/types'
import { defaultNodeSizeForRole } from '../core/nodeSizing'

const roleColorMap: Record<NodeSemanticRole, string> = {
  trigger:   'trigger',
  queue:     'queue',
  worker:    'worker',
  scheduler: 'cron',
  process:   'process',
  decision:  'decision',
  resource:  'resource',
  detail:    'detail',
  group:     'group',
  note:      'detail',
}

const roleShapeMap: Record<NodeSemanticRole, NodeShape> = {
  trigger: 'pill',
  queue: 'roundedRect',
  worker: 'roundedRect',
  scheduler: 'roundedRect',
  process: 'roundedRect',
  decision: 'diamond',
  resource: 'cylinder',
  detail: 'roundedRect',
  group: 'group',
  note: 'annotation',
}

export function normalizeTechnicalAlias(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  let normalized = trimmed
  if (normalized.startsWith('rrq:queue:')) {
    normalized = normalized.slice('rrq:queue:'.length)
  }
  if (normalized.startsWith('handle_')) {
    normalized = normalized.slice('handle_'.length)
  }

  return normalized.replaceAll('_', '-')
}

function inferSemanticRole(node: FlowNodeConfig): NodeSemanticRole {
  if (node.semanticRole) {
    return node.semanticRole
  }

  if (node.type === 'pill') {
    return 'trigger'
  }
  if (node.type === 'diamond') {
    return 'decision'
  }
  if (node.type === 'cylinder') {
    return 'resource'
  }
  if (node.type === 'group') {
    return 'group'
  }
  if (node.type === 'annotation') {
    return 'note'
  }
  if (node.style?.icon === 'queue') {
    return 'queue'
  }
  if (node.style?.icon === 'worker' || node.sublabel?.trim().toLowerCase() === 'workers') {
    return 'worker'
  }
  if (node.style?.icon === 'cron') {
    return 'scheduler'
  }
  if (node.type === 'badge') {
    return 'detail'
  }
  if (node.parentId) {
    return 'detail'
  }

  return 'process'
}

function normalizeStyle(node: FlowNodeConfig, semanticRole: NodeSemanticRole): NodeStyle | undefined {
  const nextStyle = { ...(node.style ?? {}) }

  if (semanticRole === 'queue' && !nextStyle.icon) {
    nextStyle.icon = 'queue'
  }
  if (semanticRole === 'worker' && !nextStyle.icon) {
    nextStyle.icon = 'worker'
  }
  if (semanticRole === 'scheduler' && !nextStyle.icon) {
    nextStyle.icon = 'cron'
  }

  if (!nextStyle.color) {
    nextStyle.color = roleColorMap[semanticRole]
  }

  return Object.keys(nextStyle).length > 0 ? nextStyle : undefined
}

export function withNodeVisualDefaults(node: FlowNodeConfig): FlowNodeConfig {
  const semanticRole = inferSemanticRole(node)
  const normalizedType = roleShapeMap[semanticRole]
  const defaultSize = defaultNodeSizeForRole(semanticRole, normalizedType)

  return {
    ...node,
    semanticRole,
    type: normalizedType,
    style: normalizeStyle(node, semanticRole),
    size: defaultSize
      ? {
          width: node.size?.width ?? defaultSize.width,
          height: node.size?.height ?? defaultSize.height,
        }
      : node.size,
  }
}

export function withNodeVisualDefaultsForFlow(nodes: FlowNodeConfig[]): FlowNodeConfig[] {
  return nodes.map((node) => withNodeVisualDefaults(node))
}

type SemanticNodeInput = Omit<FlowNodeConfig, 'type' | 'semanticRole'>

export function triggerNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'pill', semanticRole: 'trigger' })
}

export function queueNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'roundedRect', semanticRole: 'queue' })
}

export function workerNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'roundedRect', semanticRole: 'worker' })
}

export function processNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'roundedRect', semanticRole: 'process' })
}

export function decisionNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'diamond', semanticRole: 'decision' })
}

export function resourceNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'cylinder', semanticRole: 'resource' })
}

export function detailGroup(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'group', semanticRole: 'group' })
}

export function detailNode(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'roundedRect', semanticRole: 'detail' })
}

export function note(input: SemanticNodeInput): FlowNodeConfig {
  return withNodeVisualDefaults({ ...input, type: 'annotation', semanticRole: 'note' })
}
