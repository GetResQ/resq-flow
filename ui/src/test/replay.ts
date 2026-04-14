import type { FlowEvent } from '../core/types'

import { loadReplaySelection, summarizeReplaySelection } from './replayScenarios'

const DEFAULT_WS_URL = 'ws://localhost:4200/ws'
const DEFAULT_RESET_URL = 'http://localhost:4200/v1/dev/reset'

function parseSpeedArg(defaultSpeed = 1): number {
  const speedFlagIndex = process.argv.findIndex((arg) => arg === '--speed')
  if (speedFlagIndex === -1) {
    return defaultSpeed
  }

  const value = process.argv[speedFlagIndex + 1]
  if (!value) {
    return defaultSpeed
  }

  const normalized = value.endsWith('x') ? value.slice(0, -1) : value
  const parsed = Number.parseFloat(normalized)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultSpeed
  }

  return parsed
}

function parseFlagValue(flag: string): string | undefined {
  const flagIndex = process.argv.findIndex((arg) => arg === flag)
  if (flagIndex === -1) {
    return undefined
  }

  const value = process.argv[flagIndex + 1]
  if (!value || value.startsWith('--')) {
    return undefined
  }

  return value
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatReplayTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toISOString()
}

function shiftReplayTimestamp(timestamp: string | undefined, offsetMs: number): string | undefined {
  if (!timestamp) {
    return undefined
  }

  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed)) {
    return timestamp
  }

  return formatReplayTimestamp(parsed + offsetMs)
}

export function rebaseReplayEventsForLivePlayback(
  events: FlowEvent[],
  anchorTimeMs = Date.now(),
): FlowEvent[] {
  if (events.length === 0) {
    return events
  }

  const firstEventTimeMs = Date.parse(events[0].timestamp)
  if (!Number.isFinite(firstEventTimeMs)) {
    return events
  }

  const offsetMs = anchorTimeMs - firstEventTimeMs

  return events.map((event) => ({
    ...event,
    timestamp: shiftReplayTimestamp(event.timestamp, offsetMs) ?? event.timestamp,
    start_time: shiftReplayTimestamp(event.start_time, offsetMs),
    end_time: shiftReplayTimestamp(event.end_time, offsetMs),
  }))
}

async function connectRelay(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error(`timed out connecting to relay at ${url}`))
    }, 2_000)

    ws.onopen = () => {
      clearTimeout(timeout)
      resolve(ws)
    }

    ws.onerror = () => {
      clearTimeout(timeout)
      reject(new Error(`failed to connect to relay at ${url}`))
    }
  })
}

async function resetRelaySession(url: string): Promise<void> {
  const response = await fetch(url, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`failed to reset relay live session at ${url}: ${response.status}`)
  }
}

async function replayToRelay(socket: WebSocket, events: FlowEvent[], speed: number) {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const next = events[index + 1]

    socket.send(JSON.stringify(event))
    // eslint-disable-next-line no-console
    console.log(`[replay] sent ${event.type} ${event.span_name ?? event.message ?? ''}`)

    if (!next) {
      continue
    }

    const delta = Math.max(Date.parse(next.timestamp) - Date.parse(event.timestamp), 0)
    if (delta > 0) {
      await delay(delta / speed)
    }
  }
}

async function main() {
  const speed = parseSpeedArg(1)
  const scenarioId = parseFlagValue('--scenario')
  const validateOnly = hasFlag('--validate-only')
  const selection = await loadReplaySelection({ scenarioId })
  const summary = summarizeReplaySelection(selection)

  // eslint-disable-next-line no-console
  console.log(
    `[replay] loaded ${selection.scenario?.id ?? 'default-fixture'} (${summary.eventCount} events, ${summary.mappedNodeIds.length} mapped nodes)`,
  )
  if (selection.scenario) {
    // eslint-disable-next-line no-console
    console.log(`[replay] scenario: ${selection.scenario.name}`)
  }

  if (summary.threadIds.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[replay] threads: ${summary.threadIds.join(', ')}`)
  }

  if (validateOnly) {
    // eslint-disable-next-line no-console
    console.log(`[replay] validation ok`)
    return
  }

  const livePlaybackEvents = rebaseReplayEventsForLivePlayback(selection.events)

  try {
    await resetRelaySession(DEFAULT_RESET_URL)
    // eslint-disable-next-line no-console
    console.log(`[replay] reset ${DEFAULT_RESET_URL}`)
    const socket = await connectRelay(DEFAULT_WS_URL)
    // eslint-disable-next-line no-console
    console.log(`[replay] connected to ${DEFAULT_WS_URL}`)
    await replayToRelay(socket, livePlaybackEvents, speed)
    socket.close()
    // eslint-disable-next-line no-console
    console.log('[replay] complete')
    return
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[replay] relay unavailable; start the relay first with `make dev` or `make dev-relay`', error)
    process.exit(1)
  }
}

if (import.meta.main) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[replay] failed', error)
    process.exit(1)
  })
}
