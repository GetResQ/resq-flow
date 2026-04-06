# Trace Replay Feature

## Goal

When a user selects a run/trace (from the bottom drawer or inspector), they can
click "Replay" to watch that single trace animate through the flow canvas
step-by-step — nodes light up, edges pulse, and logs stream in the order they
originally occurred.

## Why

- **Debugging**: see exactly how a run progressed through the pipeline, where it
  slowed down, and where it errored
- **Demo/storytelling**: replay a successful run for stakeholders
- **Comprehension**: understand flow behavior without reading raw logs

## Existing Infrastructure

The hooks needed are already built. Replay is mostly a wiring exercise.

### useEventPlayback (hooks/useEventPlayback.ts)

Manages progressive event reveal with timing based on real timestamp deltas.

```
Input:  sourceEvents: FlowEvent[], options: { resetKey }
Output: {
  events        — currently visible slice of sourceEvents
  speed         — 0.25x to 16x
  paused        — boolean
  pendingCount  — remaining events
  setSpeed / togglePaused / pause / resume / stepForward / clearPlayback
}
```

Resets fully when `resetKey` changes. Already supports speed control and
step-through. **No changes needed** — just feed it filtered events.

### useFlowAnimations (hooks/useFlowAnimations.ts)

Consumes events incrementally, produces `nodeStatuses` (idle/active/success/error)
and `activeEdges` for the canvas.

```
Input:  { events, spanMapping, edges, sessionKey }
Output: { nodeStatuses: Map<string, NodeRuntimeStatus>, activeEdges: Set<string> }
```

Already tracks edges per-trace via `traceLastNodeRef`. Resets all animation state
when `sessionKey` changes. **No changes needed** — when fed only one trace's
events with a new sessionKey, it will animate only that trace's nodes.

### useTraceJourney (hooks/useTraceJourney.ts)

Groups events by trace ID into journeys with node paths, stages, timing, and
status. Already perfectly separates traces.

```
Output: {
  journeys: TraceJourney[]
  journeyByTraceId: Map<string, TraceJourney>
}
```

**No changes needed** — already provides the trace-to-events mapping we need.

## Implementation Plan

### 1. Filter events by trace in FlowView

When replay is active, filter `displayedEvents` to only events matching the
selected trace ID before passing them through the pipeline.

```typescript
// New state in FlowView
const [replayTraceId, setReplayTraceId] = useState<string | undefined>()

// Filter events for the trace
const replaySourceEvents = useMemo(() => {
  if (!replayTraceId) return []
  return displayedEvents.filter(e => {
    const execKey = e.trace_id ?? e.attributes?.trace_id
    return execKey === replayTraceId
  })
}, [displayedEvents, replayTraceId])

// Feed into existing playback hook
const tracePlayback = useEventPlayback(replaySourceEvents, {
  resetKey: replayTraceId,
})

// When replaying, use playback events; otherwise use all events
const animationEvents = replayTraceId ? tracePlayback.events : displayedEvents
```

Pass `animationEvents` (instead of `displayedEvents`) to `useFlowAnimations`,
`useLogStream`, and `useTraceTimeline`. Include `replayTraceId` in the
`runtimeSessionKey` so all hooks reset when replay starts/stops.

### 2. Add replay trigger to run selection UI

Add a "Replay" button to the run row in `RunsTable` or the `TraceDetailPanel`
inspector. Clicking it sets `replayTraceId` and switches to the Flow (canvas)
view.

```typescript
// In RunsTable or TraceDetailPanel
<Button onClick={() => onReplayTrace(journey.traceId)}>
  Replay
</Button>
```

### 3. Replay controls (lightweight)

When `replayTraceId` is active, show a small contextual toolbar on the canvas
(not in the header or settings dropdown). Something like:

```
┌─────────────────────────────────────────────┐
│  Replaying: mail-abc123  [1x ▾] [⏸] [→]  ✕ │
└─────────────────────────────────────────────┘
```

- Floating bar at the top of the canvas (similar to the existing focus mode pill)
- Shows trace identifier, speed selector, pause/resume, step, and exit
- Disappearing when replay finishes or user clicks exit

### 4. Exit replay

Clicking exit (or pressing Escape) clears `replayTraceId`, which resets the
`sessionKey`, which causes all animation hooks to clear and resume showing all
live events.

## What changes per file

| File | Change |
|---|---|
| `FlowView.tsx` | Add `replayTraceId` state, filter events, wire playback hook, include in sessionKey |
| `RunsTable.tsx` | Add "Replay" button per run row |
| `TraceDetailPanel.tsx` | Add "Replay" button in inspector header |
| `FlowCanvas.tsx` | Render replay toolbar overlay when active |

No changes needed to: `useEventPlayback`, `useFlowAnimations`,
`useTraceJourney`, `useLogStream`, `useTraceTimeline`.

## Scope

This is a wiring feature, not a new system. The animation pipeline, playback
hook, and trace separation all exist. The work is:

1. State management for `replayTraceId`
2. Event filtering
3. UI triggers (replay button)
4. Replay toolbar overlay

## Future extensions

- **Auto-replay on run selection**: when a user clicks a completed run, auto-start
  replay instead of requiring a separate button
- **Progress indicator**: show a timeline scrubber showing replay position
- **Replay from history**: combine with the "Load past runs" mechanism to replay
  runs from before the current session
- **Share replay**: generate a permalink to a specific run replay
