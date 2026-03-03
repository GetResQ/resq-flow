import { useCallback, useEffect, useRef, useState } from 'react'

import { inferErrorState, readStringAttribute, resolveMappedNodeId } from '../mapping'
import type {
  FlowAnimationState,
  FlowEdgeConfig,
  FlowEvent,
  NodeRuntimeStatus,
  SpanMapping,
} from '../types'

const NODE_SUCCESS_RESET_MS = 3_000
const NODE_PULSE_RESET_MS = 750
const DURATION_VISIBLE_MS = 5_000
const EDGE_ACTIVE_MS = 700

function nowMs(): number {
  return Date.now()
}

function parseTimestampMs(timestamp: string | undefined): number | null {
  if (!timestamp) {
    return null
  }

  const parsed = Date.parse(timestamp)
  if (Number.isNaN(parsed)) {
    return null
  }

  return parsed
}

function resolveDurationMs(event: FlowEvent, spanStarts: Map<string, number>): number | undefined {
  if (typeof event.duration_ms === 'number') {
    return event.duration_ms
  }

  if (!event.span_id) {
    return undefined
  }

  const start = spanStarts.get(event.span_id)
  const end = parseTimestampMs(event.end_time ?? event.timestamp)
  if (typeof start === 'number' && typeof end === 'number' && end >= start) {
    return end - start
  }

  return undefined
}

function matchCandidate(spanMapping: SpanMapping, candidate: string | undefined): string | null {
  if (!candidate) {
    return null
  }

  if (spanMapping[candidate]) {
    return spanMapping[candidate]
  }

  for (const [pattern, nodeId] of Object.entries(spanMapping)) {
    if (candidate.includes(pattern) || pattern.includes(candidate)) {
      return nodeId
    }
  }

  return null
}

interface UseFlowAnimationsInput {
  events: FlowEvent[]
  spanMapping: SpanMapping
  edges?: FlowEdgeConfig[]
}

export function useFlowAnimations({
  events,
  spanMapping,
  edges = [],
}: UseFlowAnimationsInput): FlowAnimationState {
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeRuntimeStatus>>(new Map())
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set())

  const processedIndexRef = useRef(0)
  const spanStartRef = useRef<Map<string, number>>(new Map())
  const nodeResetTimersRef = useRef<Map<string, number>>(new Map())
  const edgeResetTimersRef = useRef<Map<string, number>>(new Map())
  const traceLastNodeRef = useRef<Map<string, string>>(new Map())

  const clearStatuses = useCallback(() => {
    for (const timer of nodeResetTimersRef.current.values()) {
      window.clearTimeout(timer)
    }
    for (const timer of edgeResetTimersRef.current.values()) {
      window.clearTimeout(timer)
    }

    nodeResetTimersRef.current.clear()
    edgeResetTimersRef.current.clear()
    spanStartRef.current.clear()
    traceLastNodeRef.current.clear()
    processedIndexRef.current = 0

    setNodeStatuses(new Map())
    setActiveEdges(new Set())
  }, [])

  const updateNodeStatus = useCallback(
    (nodeId: string, updater: (previous: NodeRuntimeStatus | undefined) => NodeRuntimeStatus) => {
      setNodeStatuses((previous) => {
        const next = new Map(previous)
        next.set(nodeId, updater(previous.get(nodeId)))
        return next
      })
    },
    [],
  )

  const scheduleNodeIdle = useCallback(
    (nodeId: string, delayMs: number) => {
      const existing = nodeResetTimersRef.current.get(nodeId)
      if (existing) {
        window.clearTimeout(existing)
      }

      const timer = window.setTimeout(() => {
        updateNodeStatus(nodeId, (previous) => {
          const nextCounter = previous?.counter
          return {
            status: 'idle',
            updatedAt: nowMs(),
            counter: nextCounter,
            durationMs: previous?.durationMs,
            durationVisibleUntil: previous?.durationVisibleUntil,
            lastMessage: previous?.lastMessage,
          }
        })
        nodeResetTimersRef.current.delete(nodeId)
      }, delayMs)

      nodeResetTimersRef.current.set(nodeId, timer)
    },
    [updateNodeStatus],
  )

  const activateEdge = useCallback((edgeId: string) => {
    setActiveEdges((previous) => {
      const next = new Set(previous)
      next.add(edgeId)
      return next
    })

    const existing = edgeResetTimersRef.current.get(edgeId)
    if (existing) {
      window.clearTimeout(existing)
    }

    const timer = window.setTimeout(() => {
      setActiveEdges((previous) => {
        const next = new Set(previous)
        next.delete(edgeId)
        return next
      })
      edgeResetTimersRef.current.delete(edgeId)
    }, EDGE_ACTIVE_MS)

    edgeResetTimersRef.current.set(edgeId, timer)
  }, [])

  useEffect(() => {
    if (events.length < processedIndexRef.current) {
      clearStatuses()
      processedIndexRef.current = 0
    }

    if (events.length === processedIndexRef.current) {
      return
    }

    const edgeLookup = new Map(edges.map((edge) => [`${edge.source}->${edge.target}`, edge.id]))

    const pending = events.slice(processedIndexRef.current)
    processedIndexRef.current = events.length

    for (const event of pending) {
      const mappedNodeId = resolveMappedNodeId(event, spanMapping)
      const action = readStringAttribute(event.attributes, 'action')
      const queueName = readStringAttribute(event.attributes, 'queue_name')
      const workerName = readStringAttribute(event.attributes, 'worker_name')
      const timestamp = parseTimestampMs(event.start_time ?? event.timestamp) ?? nowMs()

      if (event.trace_id && mappedNodeId) {
        const previousNode = traceLastNodeRef.current.get(event.trace_id)
        if (previousNode && previousNode !== mappedNodeId) {
          const edgeId = edgeLookup.get(`${previousNode}->${mappedNodeId}`)
          if (edgeId) {
            activateEdge(edgeId)
          }
        }
        traceLastNodeRef.current.set(event.trace_id, mappedNodeId)
      }

      if (event.type === 'span_start') {
        if (event.span_id) {
          spanStartRef.current.set(event.span_id, timestamp)
        }

        if (mappedNodeId) {
          updateNodeStatus(mappedNodeId, (previous) => ({
            status: 'active',
            counter: previous?.counter,
            updatedAt: nowMs(),
            lastMessage: event.message ?? event.span_name,
            durationMs: previous?.durationMs,
            durationVisibleUntil: previous?.durationVisibleUntil,
          }))
        }

        continue
      }

      if (event.type === 'span_end') {
        if (!mappedNodeId) {
          continue
        }

        const durationMs = resolveDurationMs(event, spanStartRef.current)
        if (event.span_id) {
          spanStartRef.current.delete(event.span_id)
        }

        const isError = inferErrorState(event)
        updateNodeStatus(mappedNodeId, (previous) => ({
          status: isError ? 'error' : 'success',
          counter: previous?.counter,
          durationMs,
          durationVisibleUntil: nowMs() + DURATION_VISIBLE_MS,
          updatedAt: nowMs(),
          lastMessage: event.message ?? event.span_name,
        }))

        if (!isError) {
          scheduleNodeIdle(mappedNodeId, NODE_SUCCESS_RESET_MS)
        }

        continue
      }

      if (event.type === 'log') {
        if (action === 'enqueue') {
          const queueNodeId = mappedNodeId ?? matchCandidate(spanMapping, queueName)
          if (queueNodeId) {
            updateNodeStatus(queueNodeId, (previous) => ({
              status: 'active',
              counter: (previous?.counter ?? 0) + 1,
              updatedAt: nowMs(),
              lastMessage: event.message ?? queueName,
              durationMs: previous?.durationMs,
              durationVisibleUntil: previous?.durationVisibleUntil,
            }))
            scheduleNodeIdle(queueNodeId, NODE_PULSE_RESET_MS)
          }
        }

        if (action === 'worker_pickup') {
          const queueNodeId = matchCandidate(spanMapping, queueName)
          if (queueNodeId) {
            updateNodeStatus(queueNodeId, (previous) => ({
              status: 'active',
              counter: Math.max((previous?.counter ?? 0) - 1, 0),
              updatedAt: nowMs(),
              lastMessage: event.message ?? queueName,
              durationMs: previous?.durationMs,
              durationVisibleUntil: previous?.durationVisibleUntil,
            }))
            scheduleNodeIdle(queueNodeId, NODE_PULSE_RESET_MS)
          }

          const workerNodeId = matchCandidate(spanMapping, workerName) ?? mappedNodeId
          if (workerNodeId) {
            updateNodeStatus(workerNodeId, (previous) => ({
              status: 'active',
              counter: previous?.counter,
              updatedAt: nowMs(),
              lastMessage: event.message ?? workerName,
              durationMs: previous?.durationMs,
              durationVisibleUntil: previous?.durationVisibleUntil,
            }))
            scheduleNodeIdle(workerNodeId, NODE_PULSE_RESET_MS)

            if (queueNodeId) {
              const edgeId = edgeLookup.get(`${queueNodeId}->${workerNodeId}`)
              if (edgeId) {
                activateEdge(edgeId)
              }
            }
          }
        }
      }
    }
  }, [
    activateEdge,
    clearStatuses,
    edges,
    events,
    scheduleNodeIdle,
    spanMapping,
    updateNodeStatus,
  ])

  useEffect(
    () => () => {
      for (const timer of nodeResetTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
      for (const timer of edgeResetTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
    },
    [],
  )

  return {
    nodeStatuses,
    activeEdges,
    clearStatuses,
  }
}
