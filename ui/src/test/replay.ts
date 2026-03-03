import type { FlowEvent } from '../core/types'

import { loadReplayFixture, runDirectReplay } from './replay-direct'

const DEFAULT_WS_URL = 'ws://localhost:4200/ws'

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const events = await loadReplayFixture()

  try {
    const socket = await connectRelay(DEFAULT_WS_URL)
    // eslint-disable-next-line no-console
    console.log(`[replay] connected to ${DEFAULT_WS_URL}`)
    await replayToRelay(socket, events, speed)
    socket.close()
    // eslint-disable-next-line no-console
    console.log('[replay] complete')
    return
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[replay] relay unavailable, falling back to direct replay mode', error)
  }

  await runDirectReplay(events, speed)
}

if (import.meta.main) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[replay] failed', error)
    process.exit(1)
  })
}
