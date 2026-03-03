import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useEffect, useMemo } from 'react'

import { edgeTypes } from '../edges'
import { nodeTypes } from '../nodes'
import type { FlowEdge, FlowNode } from '../nodes/types'
import type { FlowConfig, LogEntry, NodeRuntimeStatus, SpanEntry } from '../types'

function mapFlowNodes(
  flow: FlowConfig,
  nodeStatuses: Map<string, NodeRuntimeStatus>,
  nodeLogMap: Map<string, LogEntry[]>,
  selectedNodeId?: string,
): FlowNode[] {
  return flow.nodes.map((node) => {
    const status = nodeStatuses.get(node.id)

    return {
      id: node.id,
      type: node.type,
      position: node.position,
      parentId: node.parentId,
      selectable: node.selectable ?? true,
      draggable: node.draggable ?? true,
      data: {
        label: node.label,
        sublabel: node.sublabel,
        bullets: node.bullets,
        style: node.style,
        handles: node.handles,
        status,
        counter: status?.counter,
        logs: nodeLogMap.get(node.id) ?? [],
        resizable: node.resizable,
        minSize: node.minSize,
      },
      style: {
        width: node.size?.width,
        height: node.size?.height,
        zIndex: node.type === 'group' ? 0 : 10,
        outline: selectedNodeId === node.id ? '2px solid rgba(56, 189, 248, 0.8)' : undefined,
        outlineOffset: selectedNodeId === node.id ? '2px' : undefined,
      },
      extent: node.parentId ? 'parent' : undefined,
    }
  })
}

function mapFlowEdges(flow: FlowConfig, activeEdges: Set<string>): FlowEdge[] {
  return flow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    type: edge.type ?? 'animated',
    animated: edge.animated,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.type === 'dashed' ? '#94a3b8' : '#64748b',
      width: 16,
      height: 16,
    },
    data: {
      active: activeEdges.has(edge.id),
    },
    zIndex: 5,
  }))
}

interface FlowCanvasProps {
  flow: FlowConfig
  nodeStatuses: Map<string, NodeRuntimeStatus>
  activeEdges: Set<string>
  nodeLogMap: Map<string, LogEntry[]>
  nodeSpans: Map<string, SpanEntry[]>
  selectedNodeId?: string
  onSelectNode: (nodeId?: string) => void
}

export function FlowCanvas({
  flow,
  nodeStatuses,
  activeEdges,
  nodeLogMap,
  selectedNodeId,
  onSelectNode,
}: FlowCanvasProps) {
  const initialNodes = useMemo(
    () => mapFlowNodes(flow, nodeStatuses, nodeLogMap, selectedNodeId),
    [flow, nodeStatuses, nodeLogMap, selectedNodeId],
  )
  const initialEdges = useMemo(() => mapFlowEdges(flow, activeEdges), [activeEdges, flow])

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges)

  useEffect(() => {
    setNodes(mapFlowNodes(flow, nodeStatuses, nodeLogMap, selectedNodeId))
  }, [flow, nodeLogMap, nodeStatuses, selectedNodeId, setNodes])

  useEffect(() => {
    setEdges(mapFlowEdges(flow, activeEdges))
  }, [activeEdges, flow, setEdges])

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelectNode(node.id)
  }

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        className="absolute left-3 top-3 z-20 rounded border border-slate-700 bg-slate-900/95 px-2 py-1 text-[10px] text-slate-200"
        onClick={() => {
          const payload = nodes.reduce<Record<string, { x: number; y: number }>>((acc, node) => {
            acc[node.id] = node.position
            return acc
          }, {})

          // Manual layout iteration helper.
          // eslint-disable-next-line no-console
          console.log('save positions', payload)
        }}
      >
        Save positions
      </button>

      <ReactFlow
        fitView
        fitViewOptions={{
          maxZoom: 1.1,
          padding: 0.12,
          nodes: nodes.filter((node) => node.type !== 'group'),
        }}
        minZoom={0.2}
        maxZoom={1.6}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={() => onSelectNode(undefined)}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ zIndex: 5 }}
        className="bg-slate-950"
      >
        <MiniMap className="!bg-slate-900/95" pannable zoomable />
        <Controls className="!border !border-slate-700 !bg-slate-900/95" />
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.2} color="#334155" />
      </ReactFlow>
    </div>
  )
}
