import { useCallback, useEffect, useRef, useState } from 'react'

import type { FlowEvent, RelayConnectionState } from '../types'

const DEFAULT_RELAY_WS_URL = 'ws://localhost:4200/ws'
const MAX_RECONNECT_DELAY_MS = 10_000

function toFlowEvent(payload: unknown): FlowEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const event = payload as Partial<FlowEvent>
  if (!event.type || !event.timestamp) {
    return null
  }

  return event as FlowEvent
}

export function useRelayConnection(wsUrl = DEFAULT_RELAY_WS_URL): RelayConnectionState {
  const [events, setEvents] = useState<FlowEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const attemptsRef = useRef(0)
  const shouldReconnectRef = useRef(true)

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  useEffect(() => {
    shouldReconnectRef.current = true

    const scheduleReconnect = () => {
      if (!shouldReconnectRef.current) {
        return
      }

      attemptsRef.current += 1
      const delay = Math.min(2 ** (attemptsRef.current - 1) * 1_000, MAX_RECONNECT_DELAY_MS)
      setReconnecting(true)

      reconnectTimerRef.current = window.setTimeout(() => {
        connect()
      }, delay)
    }

    const connect = () => {
      if (!shouldReconnectRef.current) {
        return
      }

      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        attemptsRef.current = 0
        setConnected(true)
        setReconnecting(false)
      }

      socket.onclose = () => {
        setConnected(false)
        if (shouldReconnectRef.current) {
          scheduleReconnect()
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      socket.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data as string)
          if (Array.isArray(parsed)) {
            const normalized = parsed.map(toFlowEvent).filter((event): event is FlowEvent => Boolean(event))
            if (normalized.length > 0) {
              setEvents((previous) => [...previous, ...normalized])
            }
            return
          }

          const normalized = toFlowEvent(parsed)
          if (normalized) {
            setEvents((previous) => [...previous, normalized])
          }
        } catch {
          // Ignore malformed messages from non-relay producers.
        }
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      setConnected(false)
      setReconnecting(false)

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
      }

      socketRef.current?.close()
      socketRef.current = null
    }
  }, [wsUrl])

  return { events, connected, reconnecting, clearEvents }
}
