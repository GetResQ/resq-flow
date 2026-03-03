import { useCallback, useEffect, useRef, useState } from 'react'

import { inferErrorState, resolveMappedNodeId } from '../mapping'
import type { FlowEvent, LogEntry, LogStreamState, SpanMapping } from '../types'

function compareTimestamp(left: string, right: string): number {
  return Date.parse(left) - Date.parse(right)
}

function toLogEntry(event: FlowEvent, nodeId?: string): LogEntry {
  const isError = inferErrorState(event)

  return {
    timestamp: event.timestamp,
    nodeId,
    level: isError ? 'error' : 'info',
    status: isError ? 'error' : 'ok',
    durationMs: event.duration_ms,
    message:
      event.message ??
      event.span_name ??
      (event.type === 'span_start' ? 'span started' : event.type === 'span_end' ? 'span completed' : 'log event'),
    attributes: event.attributes,
    eventType: event.type,
  }
}

export function useLogStream(events: FlowEvent[], spanMapping: SpanMapping): LogStreamState {
  const [globalLogs, setGlobalLogs] = useState<LogEntry[]>([])
  const [nodeLogMap, setNodeLogMap] = useState<Map<string, LogEntry[]>>(new Map())

  const processedIndexRef = useRef(0)

  const clearSession = useCallback(() => {
    processedIndexRef.current = 0
    setGlobalLogs([])
    setNodeLogMap(new Map())
  }, [])

  useEffect(() => {
    if (events.length < processedIndexRef.current) {
      clearSession()
      processedIndexRef.current = 0
    }

    if (events.length === processedIndexRef.current) {
      return
    }

    const pending = events.slice(processedIndexRef.current)
    processedIndexRef.current = events.length

    setGlobalLogs((previous) => {
      const merged = [...previous]
      for (const event of pending) {
        const nodeId = resolveMappedNodeId(event, spanMapping) ?? undefined
        merged.push(toLogEntry(event, nodeId))
      }
      merged.sort((left, right) => compareTimestamp(left.timestamp, right.timestamp))
      return merged
    })

    setNodeLogMap((previous) => {
      const next = new Map(previous)

      for (const event of pending) {
        const nodeId = resolveMappedNodeId(event, spanMapping)
        if (!nodeId) {
          continue
        }

        const list = next.get(nodeId) ?? []
        list.push(toLogEntry(event, nodeId))
        list.sort((left, right) => compareTimestamp(left.timestamp, right.timestamp))
        next.set(nodeId, list)
      }

      return next
    })
  }, [clearSession, events, spanMapping])

  return {
    globalLogs,
    nodeLogMap,
    clearSession,
  }
}
