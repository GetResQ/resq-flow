# Claude Plan: UI Redesign

> **Status: ✅ COMPLETE** — All 13 phases executed and verified. 72 tests pass, 0 fail. Build clean.

## Execution Summary

| Phase | Description | Status | Executor | Verified |
|-------|-------------|--------|----------|----------|
| Phase 0 | Routing & Deep Linking | ✅ Done | Codex | `tsc` + `build` + `test` clean |
| Phase 1 | Typography & Spacing Reset | ✅ Done | Codex | `build` + `test` clean |
| Phase 2 | Replace Hand-Rolled Primitives with shadcn | ✅ Done | Codex | `build` + `test` clean |
| Phase 2.5 | Flows Home & Health Overview | ✅ Done | Codex | `build` + `test` clean |
| Phase 3 | Panel System Redesign | ✅ Done | Codex | `build` + `test` clean |
| Phase 4 | Data Tables with TanStack | ✅ Done | Codex | `build` + `test` clean |
| Phase 5 | Command Palette | ✅ Done | Codex | `build` + `test` clean |
| Phase 6 | Metrics Mode & Headless Upgrade | ✅ Done | Codex | `build` + `test` clean |
| Phase 7 | Canvas Polish | ✅ Done | Claude | `build` + `test` clean |
| Phase 7.5 | Trace Waterfall | ✅ Done | Claude | `build` + `test` clean |
| Phase 8 | Card-Based Panel Content | ✅ Done | Claude | `build` + `test` clean |
| Phase 9 | Final Polish | ✅ Done | Claude | `build` + `test` clean |

### Implementation Notes

- **Phases 0-6** executed by Codex in a single autonomous run
- **Phases 7-9** executed by Claude (Opus) — creative/visual phases requiring design judgment
- **Two review gaps** caught post-Claude and fixed:
  - Phase 7c (node entrance stagger) was initially missing — added stagger with per-node `transitionDelay`
  - Phase 9a (PanelSkeleton) existed as dead code — wired into NodeDetailPanel and TraceDetailPanel
- **Mock data**: Phases 2.5 and 6 use mock metrics in `ui/src/core/mockMetrics.ts` with `// TODO: wire to useQuery when relay endpoint exists`
- **Minor deviations accepted**:
  - Semantic zoom medium/close threshold is 0.85x instead of plan's 1.0x
  - Status glow transitions use CSS `transition` instead of Motion's `animate` (functionally identical 300ms bloom)
  - No `?view=waterfall` URL deep linking for the waterfall tab (internal tab state only)

## Objective

Transform the current resq-flow UI from a functional developer tool into a modern, polished observability experience. This plan covers the visual and UX migration on top of the current app, which already includes meaningful run/journey/history behavior. It should be executed after the Codex foundation work is in place, or after an equivalent minimum foundation exists on the branch.

## Context

- Current `main` already has working run/journey/history UX, but it is still styled with older hand-rolled controls and pre-design-system tokens
- The canonical palette and component rules live in `ui/DESIGN-SYSTEM.md`
- This plan is a migration/refinement plan, not a greenfield UI build
- Existing components must be migrated incrementally -- each phase produces a working app

## Current Main Baseline

At the start of this plan, the repo already has:

- `BottomLogPanel` with `Logs` / `Runs`, search, filters, pinning, selection, and manual resize/collapse
- `TraceDetailPanel` with `Overview` and `Advanced telemetry` tabs
- `NodeDetailPanel` with overview/timing detail
- `App.tsx` wiring for history playback, run selection, theme toggle, focus-path behavior, and run/node detail panes
- Current test coverage for journey derivation, replay, event normalization, and exact-id behavior

This means that when a phase below says "create" or "replace" a surface, implement it as a migration of the existing surface rather than rebuilding the user flow from scratch.

## Pre-Requisites

Before starting Phase 2 or later, complete the Codex foundation work from `PLAN-codex-ui-foundation.md` or land an equivalent minimum foundation:

- `@/` path aliases
- `ui/src/components/ui/*` primitives
- `ui/src/lib/utils.ts`
- design-system token update in `ui/src/index.css`
- `ui/src/lib/theme.ts`
- required dependencies for Radix/shadcn, Motion, TanStack Table, TanStack Query, Zustand, React Router, Lucide, and `cmdk`

Do not start shadcn/Motion/TanStack migration work on a branch that still lacks those prerequisites.

## Design Principles

1. **Summary first, detail on demand** -- progressive disclosure at every level
2. **Generous spacing** -- 12-16px panel padding, not 3-8px. 12px labels and 14px body text, not 10px
3. **Monospace only for data** -- trace IDs, attribute values, log messages. Sans-serif for everything else
4. **Purposeful motion** -- animate state changes, panel transitions, data arrival. Never gratuitous
5. **One focus at a time** -- reduce visual competition between canvas, sidebar, and drawer

## Key References

- Design system: `ui/DESIGN-SYSTEM.md`
- Language spec: `jrodocs/resq-flow-language-spec.md` (Flow > Run > Node > Logs hierarchy)
- Current components: `ui/src/core/components/` (8 components)
- Current nodes: `ui/src/core/nodes/` (10 node types + primitives)

Implementation notes:

- When example snippets in this plan show literal Tailwind color classes or older placeholder styling, implement them using the design-system tokens and shadcn primitives from `ui/DESIGN-SYSTEM.md` rather than copying the old class names verbatim.
- Treat the old palette preview HTML as exploratory. The adopted system is `Slate Refined · Ocean Blue`.
- Preserve current behavior while migrating visuals: run selection, pinning, history query/load/playback, trace focus, and current test coverage are all part of the baseline.

---

## Phase 0: Routing & Deep Linking Foundation

**Goal**: Wire up URL-driven navigation so every subsequent phase gets deep linking for free. No visual changes.

> See `future-state.md` — Deep Linking section. Every view state must be shareable and bookmarkable.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/main.tsx` | Modify | Wrap `<App />` in `<BrowserRouter>` (or `<HashRouter>` for local-only) |
| `ui/src/App.tsx` | Modify | Extract content into `<FlowView />`, add `<Routes>` shell, migrate state to URL params |
| `ui/src/core/components/FlowView.tsx` | Create | Receives existing App.tsx canvas/panel/header content |
| `ui/src/stores/layout.ts` | Create | Zustand store for UI layout state |
| `ui/src/stores/__tests__/layout.test.ts` | Create | Unit tests for Zustand store |

### 0a. Install Router Shell

Modify `ui/src/main.tsx` — wrap `<App />` in `<BrowserRouter>`:

```tsx
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
```

Modify `ui/src/App.tsx` — add Routes:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'

// Inside App's return:
<Routes>
  <Route path="/" element={<Navigate to={`/flows/${defaultFlowId}`} replace />} />
  <Route path="/flows/:flowId" element={<FlowView />} />
</Routes>
```

Create `ui/src/core/components/FlowView.tsx` — move the existing App.tsx content (FlowCanvas, panels, header) into this component. `FlowView` reads `flowId` from `useParams()` instead of local state.

### 0b. URL State Sync

In `ui/src/App.tsx`, these specific `useState` calls must migrate:

| Current State | Migrate To | How |
|---------------|-----------|-----|
| `const [flowId, setFlowId] = useState(...)` | `useParams().flowId` | Path segment `/flows/:flowId` |
| `const [selectedNodeId, setSelectedNodeId] = useState(...)` | `useSearchParams().get('node')` | `?node=parse-headers` |
| `const [selectedTraceId, setSelectedTraceId] = useState(...)` | `useSearchParams().get('run')` | `?run=abc123` |
| `const [sourceMode, setSourceMode] = useState(...)` | `useSearchParams().get('mode')` | `?mode=live` or `?mode=history` |

Create a helper hook `ui/src/core/hooks/useUrlState.ts` that wraps `useSearchParams()` with typed getters/setters for these params. This keeps the migration clean — components call `useUrlState()` instead of raw `useSearchParams()`.

### 0c. Zustand UI Layout Store

Create `ui/src/stores/layout.ts`:

```ts
import { create } from 'zustand'

interface LayoutState {
  sidebarOpen: boolean
  focusMode: boolean
  commandPaletteOpen: boolean
  bottomPanelHeight: number
  theme: 'dark' | 'light'
  setSidebarOpen: (open: boolean) => void
  toggleFocusMode: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setBottomPanelHeight: (height: number) => void
  setTheme: (theme: 'dark' | 'light') => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  focusMode: false,
  commandPaletteOpen: false,
  bottomPanelHeight: 260,
  theme: (localStorage.getItem('resq-flow-theme') as 'dark' | 'light') ?? 'dark',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
  setTheme: (theme) => {
    localStorage.setItem('resq-flow-theme', theme)
    set({ theme })
  },
}))
```

Migrate `theme` state from `ui/src/App.tsx` into this store. The existing `theme` useState + localStorage logic in App.tsx gets replaced with `useLayoutStore()`. Other state (focusMode, bottomPanelHeight) is consumed in later phases.

### 0d. Tests

Create `ui/src/stores/__tests__/layout.test.ts`:
- Test initial state values (sidebarOpen: true, focusMode: false, theme defaults to 'dark')
- Test toggleFocusMode flips the boolean
- Test setTheme updates both state and localStorage
- Test setBottomPanelHeight stores the value

### Verification

```bash
cd ui && bun run build && bun test
```

All existing tests must still pass. New layout store tests must pass. The app should look and behave identically. URLs should now reflect the current flow. Browser back/forward should work for flow switching.

---

## Phase 1: Typography & Spacing Reset

**Goal**: Make the existing UI breathe without changing structure. This is the highest-impact, lowest-risk change.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/index.css` | Modify | Font-family to Inter (if not done in foundation) |
| `ui/src/core/components/BottomLogPanel.tsx` | Modify | Font sizes and spacing |
| `ui/src/core/components/NodeDetailPanel.tsx` | Modify | Font sizes, spacing, panel width |
| `ui/src/core/components/TraceDetailPanel.tsx` | Modify | Font sizes, spacing, panel width |
| `ui/src/core/components/FlowSelector.tsx` | Modify | Font sizes, spacing, header padding |
| `ui/src/core/components/NodeStatusBadge.tsx` | Modify | Font sizes |
| `ui/src/core/components/DurationBadge.tsx` | Modify | Font sizes |
| `ui/src/core/components/LogPanel.tsx` | Modify | Row padding, font sizes |

### 1a. Global Typography Update

In `ui/src/index.css`, update the `:root` font-family to use Inter as primary (should already be done in foundation plan, verify):

```css
:root {
  font-family: var(--font-sans);
  ...
}
```

### 1b. Component Font Size Pass

Replace tiny font sizes across all components:

| Current | New | Where |
|---------|-----|-------|
| `text-[9px]` | `text-xs` (12px) | Column headers in BottomLogPanel |
| `text-[10px]` | `text-xs` (12px) | Badges, filter chips, status text, labels |
| `text-[11px]` | `text-sm` (14px) | Log rows, run rows, tab buttons, inputs |
| `text-xs` (12px) | `text-sm` (14px) | Panel titles, header labels, select elements |

Node labels inside React Flow nodes can stay at `text-xs` / `text-[11px]` since they're in a different visual context (the canvas).

### 1c. Spacing Pass

Replace tight padding across all components:

| Current | New | Where |
|---------|-----|-------|
| `px-2 py-0.5` | `px-3 py-1.5` | Buttons |
| `px-3` panel padding | `px-4` | BottomLogPanel, NodeDetailPanel, TraceDetailPanel |
| `py-1` row padding | `py-2` | Log rows, run rows |
| `gap-1` | `gap-2` | Filter chip groups, badge groups |
| `py-2` header padding | `py-3` | FlowSelector header |
| `p-2` card padding | `p-3` | Stat cards in NodeDetailPanel, TraceDetailPanel |

### 1d. Panel Width Update

- NodeDetailPanel: `w-[340px]` -> `w-[400px]`
- TraceDetailPanel: `w-[380px]` -> `w-[440px]`
- BottomLogPanel default height: `220px` -> `260px`

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Open `bun run dev` (or `make dev`), navigate through all panels. Text should be readable without squinting. Panels should feel spacious but not empty.

---

## Phase 2: Replace Hand-Rolled Primitives with shadcn

**Goal**: Swap all hand-rolled buttons, tabs, inputs, badges, and dropdowns with shadcn equivalents. This gets consistency, keyboard nav, and accessibility for free.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/BottomLogPanel.tsx` | Modify | Replace hand-rolled tabs, buttons, inputs, scroll areas, separators with shadcn |
| `ui/src/core/components/NodeDetailPanel.tsx` | Modify | Replace tabs, close button, scroll area, stat cards |
| `ui/src/core/components/TraceDetailPanel.tsx` | Modify | Replace tabs, close button, scroll area, badges |
| `ui/src/core/components/FlowSelector.tsx` | Modify | Replace buttons, selects, input, tooltip, dropdown menu |
| `ui/src/core/components/NodeStatusBadge.tsx` | Modify | Replace with shadcn Badge |
| `ui/src/core/components/LogPanel.tsx` | Modify | Replace scroll area |

### 2a. Tabs Migration (3 instances)

Replace the hand-rolled tab systems in:
- `BottomLogPanel.tsx` (logs/runs tabs)
- `NodeDetailPanel.tsx` (overview/timing tabs)
- `TraceDetailPanel.tsx` (overview/advanced tabs)

With `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` from `@/components/ui/tabs`.

Before:
```tsx
<button onClick={() => setTab('logs')} className={tab === 'logs' ? 'bg-sky-600 ...' : '...'}>
```

After:
```tsx
<Tabs value={tab} onValueChange={(v) => setTab(v as PanelTab)}>
  <TabsList>
    <TabsTrigger value="logs">Logs</TabsTrigger>
    <TabsTrigger value="traces">Runs</TabsTrigger>
  </TabsList>
  <TabsContent value="logs">...</TabsContent>
  <TabsContent value="traces">...</TabsContent>
</Tabs>
```

### 2b. Button Migration

Replace all `<button>` elements that act as UI controls (not clickable data rows) with `<Button>` from `@/components/ui/button`:
- FlowSelector: playback controls, focus toggle, clear session, settings, theme toggle
- BottomLogPanel: collapse toggle, filter chips, pin buttons
- NodeDetailPanel: close button
- TraceDetailPanel: close button

Use appropriate variants: `ghost` for icon buttons, `outline` for toggle-style buttons, `default` for primary actions.

### 2c. Input Migration

Replace all `<input>` elements with `<Input>` from `@/components/ui/input`:
- BottomLogPanel: search input
- FlowSelector: history query input

### 2d. Select Migration

Replace `<select>` elements with shadcn `<Select>`:
- FlowSelector: flow selector dropdown
- FlowSelector: playback speed selector
- FlowSelector: history window selector

### 2e. Badge Migration

Replace hand-built status badges with `<Badge>` from `@/components/ui/badge`:
- NodeStatusBadge: use `success`, `warning`, `destructive` variants
- Status badges in TraceDetailPanel and BottomLogPanel
- Event count pill in FlowSelector

### 2f. Tooltip Migration

Replace the custom CSS hover tooltip in FlowSelector (connection status) with `<Tooltip>`:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
    </TooltipTrigger>
    <TooltipContent>{connectionTooltip}</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 2g. Dropdown Menu Migration

Replace the settings popover in FlowSelector with `<DropdownMenu>`:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">...</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Theme: Dark</DropdownMenuItem>
    <DropdownMenuSeparator />
    ...history controls...
  </DropdownMenuContent>
</DropdownMenu>
```

### 2h. Scroll Area Migration

Replace `overflow-y-auto` containers in panels with `<ScrollArea>`:
- NodeDetailPanel content area
- TraceDetailPanel content area
- BottomLogPanel log/run lists

### 2i. Separator Migration

Replace `<div className="h-px bg-slate-800" />` dividers with `<Separator>`.

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: All interactive elements should have consistent styling, proper focus rings, keyboard navigation. Tab through the header controls -- everything should be reachable.

---

## Phase 2.5: Flows Home & Health Overview

**Goal**: Build the multi-flow landing page. This is the product's front door — answers "are my systems healthy?" at a glance.

> See `future-state.md` — Level 0: Flows Home. This is the view that makes resq-flow a product, not a single-flow dev tool.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/FlowHealthCard.tsx` | Create | Flow summary card with health status, stats, sparklines |
| `ui/src/core/components/Sparkline.tsx` | Create | Pure SVG sparkline primitive |
| `ui/src/core/components/FlowsHome.tsx` | Create | Multi-flow landing page |
| `ui/src/core/components/StatMini.tsx` | Create | Compact stat display component |
| `ui/src/App.tsx` | Modify | Add `/` route pointing to FlowsHome |
| `ui/src/core/components/__tests__/Sparkline.test.tsx` | Create | Unit test for Sparkline rendering |
| `ui/src/core/components/__tests__/FlowsHome.test.tsx` | Create | Unit test for FlowsHome rendering with mock flow data |

> **BLOCKER NOTE**: This phase needs aggregated metrics data (run counts, success rates, p95 latency) from Victoria via the relay. If the relay does not yet have an aggregation endpoint, implement FlowsHome with **mock/static data first** and add a `// TODO: replace with useQuery` comment. The mock data structure should match the expected query response shape so the swap is mechanical later. See Open Questions at the end of this doc.

### 2.5a. Flow Health Card Component

Create `ui/src/core/components/FlowHealthCard.tsx`:

```tsx
<Card className="cursor-pointer hover:border-[var(--border-accent)]">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">{flow.name}</CardTitle>
    <StatusBadge status={flow.health} />
  </CardHeader>
  <CardContent>
    <div className="flex gap-4">
      <StatMini label="Runs/24h" value={flow.runCount} />
      <StatMini label="Success" value={`${flow.successRate}%`} />
      <StatMini label="p95" value={`${flow.p95Ms}ms`} />
    </div>
    <div className="mt-2 flex gap-3">
      <Sparkline data={flow.throughputSeries} className="h-6 flex-1" />
      <Sparkline data={flow.errorSeries} className="h-6 w-16" variant="error" />
    </div>
  </CardContent>
</Card>
```

### 2.5b. Sparkline Primitive

Create `ui/src/core/components/Sparkline.tsx`:
- Pure SVG component, no charting library needed
- Props: `data: number[]`, `variant: 'default' | 'error'`, `className`
- Renders as a polyline in an SVG viewBox
- Default variant uses `var(--accent-primary)`, error variant uses `var(--status-error)`
- Normalized to min/max of the data array
- ~50 lines of code, no dependencies

### 2.5c. Flows Home Page

Create `ui/src/core/components/FlowsHome.tsx`:
- Route: `/` (the app's landing page)
- Lists all registered flows from the flow registry
- Each flow rendered as a `<FlowHealthCard>`
- Click a card → navigates to `/flows/:flowId`
- Header shows "Flows" title + Cmd+K trigger button
- Uses `@tanstack/react-query` to fetch aggregated metrics from Victoria via relay

### 2.5d. StatMini Component

Create `ui/src/core/components/StatMini.tsx`:
- Compact stat display: value (`text-base font-semibold`) + label (`text-xs text-muted`)
- Used inside FlowHealthCard and later in Metrics Mode stat cards
- Optional trend indicator (`↑ 12%` or `↓ 5%`)

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Navigate to `/`. Should see all registered flows with health cards, sparklines, and summary stats. Click a flow card — should navigate to the flow view.

---

## Phase 3: Panel System Redesign

**Goal**: Reduce the visual competition between canvas, sidebar, and drawer. Introduce focus mode.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/NodeDetailPanel.tsx` | Modify | Wrap content in `<Sheet side="right">`, remove fixed sidebar positioning |
| `ui/src/core/components/TraceDetailPanel.tsx` | Modify | Wrap content in `<Sheet side="right">`, remove fixed sidebar positioning |
| `ui/src/core/components/BottomLogPanel.tsx` | Modify | Add Motion height animation, maximize button |
| `ui/src/core/components/FlowSelector.tsx` | Modify | Restructure to 3-section layout (left/center/right), fixed 48px, add focus mode toggle |
| `ui/src/core/components/FlowView.tsx` | Modify | Remove sidebar flex layout (canvas now always full-width), read focusMode from layout store |
| `ui/src/stores/layout.ts` | Modify | focusMode and bottomPanelHeight are now consumed here |

### 3a. Side Panel as Sheet

Convert NodeDetailPanel and TraceDetailPanel from always-visible sidebars to `<Sheet side="right">`:
- Panel slides in over the canvas with a subtle overlay
- Canvas stays full-width underneath
- Close on Escape key (free with Radix Dialog)
- Close button + click-outside-to-close

This eliminates the "three regions fighting for space" problem.

### 3b. Bottom Drawer Improvements

- Add smooth height animation using Motion's `animate` on the height value
- Add a "maximize" button that expands to 70vh
- When maximized, add a `<ScrollArea>` with proper scrollbar styling
- Add a subtle slide-up entrance animation when opening

### 3c. Focus Mode Toggle

Add a global focus mode that:
- Hides the header bar (collapse to a minimal floating pill)
- Maximizes canvas to full viewport
- Bottom drawer stays accessible but starts collapsed
- Toggle via button in header AND keyboard shortcut (F key)
- Animate transitions with Motion `<AnimatePresence>`

### 3d. Header Redesign

The current header is a single flex row that wraps. Redesign as:
- **Left section**: Flow selector + connection status
- **Center section**: Mode indicator (Live/History) + event count
- **Right section**: Focus toggle + theme toggle + settings dropdown
- Playback controls: Only visible in history mode, slide in with animation
- Height: Fixed at 48px, never wraps

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Open a node detail panel -- it should slide in from the right without shrinking the canvas. Toggle focus mode -- header should collapse smoothly. Resize the bottom drawer -- it should animate.

---

## Phase 4: Data Tables with TanStack

**Goal**: Replace the CSS Grid log/run tables with proper TanStack Table instances for sorting, filtering, and future virtual scrolling.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/LogsTable.tsx` | Create | TanStack Table for log entries |
| `ui/src/core/components/RunsTable.tsx` | Create | TanStack Table for runs/journeys |
| `ui/src/core/components/BottomLogPanel.tsx` | Modify | Replace inline grid rendering with LogsTable and RunsTable |
| `ui/src/core/components/__tests__/LogsTable.test.tsx` | Create | Test sorting, row click, badge rendering |
| `ui/src/core/components/__tests__/RunsTable.test.tsx` | Create | Test sorting, pinning, selection, badge rendering |

### 4a. Logs Table

Create `ui/src/core/components/LogsTable.tsx`:
- Columns: Time, Node, Message, Status, Duration
- Sortable by Time and Duration
- Use `<Table>` shadcn component for rendering
- Row click handler: select trace + node (existing behavior)
- Status column: use `<Badge variant="success">` / `<Badge variant="destructive">`
- Time column: use monospace font (`font-mono`)
- Message column: truncate with tooltip on hover

### 4b. Runs Table

Create `ui/src/core/components/RunsTable.tsx`:
- Columns: Run, Current Step, Status, Duration, Updated, Issue
- Sortable by Status, Duration, Updated
- Pin column: use `<Toggle>` or `<Button variant="ghost">`
- Selected row highlight: `bg-accent-muted`
- Status column: use `<Badge>` with appropriate variant
- Preserve existing behaviors from `BottomLogPanel`: pinning, row selection, current search/filter semantics, and selected-run highlighting

### 4c. Integrate into BottomLogPanel

Replace the inline grid rendering in BottomLogPanel with the new table components:
```tsx
<TabsContent value="logs">
  <LogsTable logs={filteredLogs} ... />
</TabsContent>
<TabsContent value="traces">
  <RunsTable journeys={filteredJourneys} ... />
</TabsContent>
```

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Click column headers in the logs table -- should sort. Verify existing click-to-select behavior still works.

---

## Phase 5: Command Palette

**Goal**: Add Cmd+K / Ctrl+K command palette for power user navigation.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/CommandPalette.tsx` | Create | cmdk-based command palette with flow/action/filter groups |
| `ui/src/core/hooks/useKeyboardShortcuts.ts` | Create | Global keyboard shortcut handler (F, Escape, 1, 2, Cmd+K) |
| `ui/src/App.tsx` | Modify | Mount CommandPalette, wire useKeyboardShortcuts |
| `ui/src/stores/layout.ts` | Modify | commandPaletteOpen state consumed by CommandPalette |
| `ui/src/core/components/__tests__/CommandPalette.test.tsx` | Create | Test search filtering, keyboard navigation |

### 5a. Create `ui/src/core/components/CommandPalette.tsx`

Using the shadcn `<CommandDialog>`:

Command groups:
- **Navigation**: Switch between flows (list all registered flows)
- **Actions**: Toggle focus mode, Toggle theme, Clear session, Load history
- **Filter**: Filter logs by node (list active nodes), Filter by trace ID

### 5b. Wire into App.tsx

- Add keyboard listener for Cmd+K / Ctrl+K
- Pass necessary callbacks (flow selection, theme toggle, etc.)
- The palette should be available globally, always

### 5c. Add Keyboard Shortcuts

Register these shortcuts (outside the command palette):
- `F` -- Toggle focus mode
- `Escape` -- Close open panel / exit focus mode
- `1` -- Switch to Logs tab
- `2` -- Switch to Runs tab

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Press Cmd+K, type "mail" -- should filter to mail-pipeline flow. Press Escape -- palette closes. Press F -- focus mode toggles.

---

## Phase 6: Metrics Mode & Headless Upgrade

**Goal**: Add a Metrics view mode available to ALL flows (graph-backed and headless), and make headless flows default to it. This is the "I just want to know if things are healthy" view.

> See `future-state.md` — Level 1: Flow View (Three Modes). Metrics mode is an equal citizen alongside Canvas and Logs.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/FlowView.tsx` | Modify | Add view mode state (canvas/metrics/logs), render switcher, conditionally render content |
| `ui/src/core/components/MetricsView.tsx` | Create | Stat cards + sparklines + recent runs table |
| `ui/src/core/components/LogsView.tsx` | Create | Full-width log stream with filters |
| `ui/src/core/components/FlowSelector.tsx` | Modify | Add view mode tabs/switcher, hide canvas-specific controls when not in canvas mode |
| `ui/src/core/hooks/useKeyboardShortcuts.ts` | Modify | Update 1/2/3 shortcuts to switch view modes |
| `ui/src/core/components/__tests__/MetricsView.test.tsx` | Create | Test stat card rendering, sparkline rendering |
| `ui/src/core/components/__tests__/LogsView.test.tsx` | Create | Test log stream rendering, filter bar |

> **BLOCKER NOTE**: MetricsView needs aggregated data from Victoria (same as Phase 2.5). Use mock data if relay endpoint doesn't exist. See Open Questions.

### 6a. View Mode Switcher

Add a view mode switcher to the flow header (tabs or segmented control):

| Mode | Key | Content |
|------|-----|---------|
| Canvas | `1` | React Flow graph (existing) |
| Metrics | `2` | Stat cards + sparklines + recent runs table |
| Logs | `3` | Full-width log stream with filters |

For headless flows (`hasGraph === false`), hide the Canvas option and default to Metrics.

### 6b. Metrics View Component

Create `ui/src/core/components/MetricsView.tsx`:
- Top row: 4 stat cards (Runs, Success Rate, p95 Latency, Errors) using `<Card>` + `<StatMini>`
- Middle section: 3 sparkline charts (Throughput, Errors, Latency) at ~80px height
- Bottom section: Recent Runs table (reuse `<RunsTable>` from Phase 4)
- Time window selector (1h, 6h, 24h) for history data
- Uses `@tanstack/react-query` for Victoria aggregation queries

### 6c. Headless Layout

When `currentFlow.hasGraph === false`:
- Default to Metrics view instead of showing a canvas placeholder
- View mode switcher shows only Metrics and Logs options
- Side panel (Sheet) still works for run detail when clicking a run row
- Hide canvas-specific controls (layout buttons, pan/pointer mode)

### 6d. Logs View Component

Create `ui/src/core/components/LogsView.tsx`:
- Full-width `<LogsTable>` (reuse from Phase 4)
- Node filter bar at top (filter by node name, status)
- Live tail toggle (auto-scroll when in live mode)
- This replaces the bottom-panel logs tab as the primary log experience when in Logs view mode

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Select any flow, press `2` — should show stat cards, sparklines, and recent runs. Select a headless flow — should default to Metrics view. Press `3` — should show full-width log stream.

---

## Phase 7: Canvas Polish

**Goal**: Make the graph visualization feel alive and premium.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/FlowCanvas.tsx` | Modify | Pass zoom level to node context |
| `ui/src/core/nodes/StandardNodeContent.tsx` | Modify | Conditionally render elements based on zoom level |
| `ui/src/core/edges/AnimatedEdge.tsx` | Modify | Add particle dot animation along edge path |
| `ui/src/core/nodes/nodePrimitives.tsx` | Modify | Add Motion-based glow transitions for status changes |
| `ui/src/core/hooks/useFlowAnimations.ts` | Modify | Expose zoom level context, smooth status transition support |

### 7a. Semantic Zoom

Add zoom-level-aware node rendering:
- **Zoomed out (< 0.6x)**: Show only node shape + status color. Hide labels, sublabels, badges, icons.
- **Medium (0.6x - 1.0x)**: Show label + status badge. Hide sublabel and bullets.
- **Zoomed in (> 1.0x)**: Show everything -- label, sublabel, status badge, icon, counter.

Implementation: Pass current zoom level from React Flow's `useViewport()` to node components via a context or prop. Use CSS transitions to fade elements in/out.

### 7b. Edge Animation Enhancement

For edges in `active` state:
- Add a subtle particle/dot animation along the edge path (a small circle that travels from source to target)
- Use CSS animation on a `<circle>` element with `<animateMotion>` along the edge path
- Only activate on edges that have had recent data flow
- Fade out after 3 seconds of inactivity

### 7c. Node Entrance Animation

When the graph first loads (after ELK layout completes):
- Stagger node entrance: each node fades in with a slight scale-up, 30ms apart
- Edges draw in after all nodes are visible
- Use Motion's `stagger` utility

### 7d. Improved Status Transitions

Current: Abrupt class changes between idle/active/success/error.
New: Use Motion's `animate` for smooth glow transitions. When a node goes from idle to active, the glow should bloom outward over 300ms, not snap.

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Zoom in and out on the canvas -- node detail should appear/disappear smoothly. Watch live telemetry -- edges should pulse when data flows. Reload the page -- nodes should animate in with a staggered entrance.

---

## Phase 7.5: Trace Waterfall

**Goal**: Add a span-level timing waterfall for Run detail. This is the "where is time being spent?" view that every serious observability tool provides.

> See `future-state.md` — Level 2: Run Detail, Trace Waterfall section.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/WaterfallChart.tsx` | Create | Horizontal span timing waterfall (SVG or div-based) |
| `ui/src/core/components/TraceDetailPanel.tsx` | Modify | Add "Waterfall" tab alongside existing Overview/Advanced |
| `ui/src/core/components/__tests__/WaterfallChart.test.tsx` | Create | Test bar rendering, critical path calculation, click handlers |

### 7.5a. Waterfall Component

Create `ui/src/core/components/WaterfallChart.tsx`:
- Horizontal bar chart showing span execution over time
- Each bar represents a node's execution span
- Bar width = duration, bar position = start time relative to run start
- Color-coded by status: `var(--status-success)`, `var(--status-error)`, `var(--status-active)`
- Labels on left: node name (truncated)
- Labels on right: duration in ms
- Pure SVG or div-based — no charting library needed

```
parse-headers  ████░░░░░░░░░░░░░░░░░  42ms
analyze        ░░░░████████░░░░░░░░░  120ms
extract-body   ░░░░░░░░░░░░████░░░░░  65ms
send-reply     ░░░░░░░░░░░░░░░░████░  80ms
──────────────────────────────────────────
Total: 307ms            Critical path: 287ms
```

### 7.5b. Critical Path Highlighting

- Identify the longest sequential chain of spans (the critical path)
- Highlight critical path spans with a brighter color or border
- Show total duration vs. critical path duration at the bottom

### 7.5c. Waterfall Interaction

- Hover a bar → tooltip with exact start time, end time, duration
- Click a bar → opens Node detail drawer for that node
- Nested spans (child spans within a node) render indented below the parent bar

### 7.5d. Integration into Run Detail

- Add "Waterfall" as a tab in the Run detail view (alongside the existing Overview)
- Accessible via URL: `/flows/:flowId/runs/:runId?view=waterfall`
- Data source: `useTraceTimeline` hook (already exists, provides span data)

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Open a completed run, switch to Waterfall tab. Should see horizontal bars showing span timing. Click a bar — node detail drawer should open. Hover for exact timing.

---

## Phase 8: Card-Based Panel Content

**Goal**: Upgrade the stat cards and insight cards in side panels with shadcn Card components and better visual hierarchy.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/NodeDetailPanel.tsx` | Modify | Replace hand-built stat cards with shadcn Card, upgrade visual hierarchy |
| `ui/src/core/components/TraceDetailPanel.tsx` | Modify | Replace stat cards, upgrade insight cards with icons, add vertical timeline for run path |

### 8a. Stat Cards

Replace the hand-built stat cards in NodeDetailPanel and TraceDetailPanel with `<Card>`:
```tsx
<Card>
  <CardHeader className="pb-2">
    <CardDescription>Latest Run</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-semibold">6.7s</p>
  </CardContent>
</Card>
```

Key change: stat values should be **larger** (text-2xl) and labels should be **smaller** (text-xs muted). This creates clear visual hierarchy.

### 8b. Insight Cards

Keep the existing insight logic but upgrade presentation:
- Use `<Card>` with a left border accent matching the tone color
- Add a small icon per tone (Lucide: `CheckCircle2`, `AlertTriangle`, `XCircle`, `Info`)
- Slightly more padding and line-height

### 8c. Run Path Visualization

Upgrade the "Path Through Flow" section in TraceDetailPanel:
- Vertical timeline layout with connecting line between steps
- Each step is a card with status dot, label, duration
- Failed steps get a prominent red accent
- Active steps get a subtle pulse animation

### Verification

```bash
cd ui && bun run build && bun test
```

**Visual check**: Open a node detail panel -- stat cards should have clear hierarchy with large values. Open a run detail -- the path visualization should read as a vertical timeline.

---

## Phase 9: Final Polish

**Goal**: Small touches that elevate the overall feel.

### Files Changed

| File | Action | What Changes |
|------|--------|-------------|
| `ui/src/core/components/NodeDetailPanel.tsx` | Modify | Add skeleton loading state |
| `ui/src/core/components/TraceDetailPanel.tsx` | Modify | Add skeleton loading state |
| `ui/src/core/components/FlowCanvas.tsx` | Modify | Add node entrance stagger via AnimatePresence |
| `ui/src/core/components/BottomLogPanel.tsx` | Modify | Add empty state with icon/message |
| `ui/src/core/components/FlowsHome.tsx` | Modify | Add empty state for no flows |
| `ui/src/index.css` | Modify | Add CSS shimmer animation, verify no #000000 usage |

### 9a. Loading States

Add skeleton loading states for:
- Panel content when selecting a node (brief shimmer)
- History mode while loading
- Use a simple CSS shimmer animation, not a library

### 9b. Empty States

Upgrade empty state messages with:
- A subtle icon (Lucide: `Inbox`, `Radio`, `Zap`)
- A short helpful message
- Appropriate spacing so it doesn't feel broken

### 9c. Transition Polish

Ensure all panel opens/closes, tab switches, and mode toggles use Motion's `<AnimatePresence>` for smooth enter/exit animations. Target: 150-200ms duration, ease-out curve.

### 9d. Dark Mode Refinement

- Ensure no pure black (#000000) anywhere -- minimum is slate-950 (#020617)
- Check all status colors at both theme modes
- Ensure sufficient contrast ratios (4.5:1 for text, 3:1 for UI components)

### Verification

```bash
cd ui && bun run build && bun test
```

### 9e. Automated Test Sweep (Last Phase Before Human Testing)

Run the full test suite and add missing coverage for new components created across all phases:

```bash
cd ui && bun test --coverage
```

**Required test files** (should already exist from earlier phases, verify and fill gaps):

| Test File | What It Covers |
|-----------|----------------|
| `ui/src/components/ui/__tests__/smoke.test.tsx` | All 14 shadcn primitives export and render (from foundation) |
| `ui/src/stores/__tests__/layout.test.ts` | Zustand store state transitions (from Phase 0) |
| `ui/src/core/components/__tests__/Sparkline.test.tsx` | SVG rendering with data arrays (from Phase 2.5) |
| `ui/src/core/components/__tests__/FlowsHome.test.tsx` | Flow cards render with mock data (from Phase 2.5) |
| `ui/src/core/components/__tests__/LogsTable.test.tsx` | Column sorting, row click, badge rendering (from Phase 4) |
| `ui/src/core/components/__tests__/RunsTable.test.tsx` | Sorting, pinning, selection (from Phase 4) |
| `ui/src/core/components/__tests__/CommandPalette.test.tsx` | Search filtering, keyboard nav (from Phase 5) |
| `ui/src/core/components/__tests__/MetricsView.test.tsx` | Stat cards, sparklines render (from Phase 6) |
| `ui/src/core/components/__tests__/WaterfallChart.test.tsx` | Bar rendering, critical path calc (from Phase 7.5) |

Verify ALL existing tests still pass (journey derivation, replay, event normalization). If any test was broken by migrations, fix it in this phase.

```bash
cd ui && bunx tsc -b --pretty false && bun run build && bun test
```

All three commands must exit 0.

---

**Human testing at the end of this phase**:

1. Open the app in dark mode. Navigate every panel, tab, and control. Nothing should feel cramped or hard to read.
2. Switch to light mode. All colors should remain legible. No invisible elements.
3. Press Cmd+K. Type a flow name. Select it. Palette should close, flow should switch.
4. Press F. Focus mode should activate. Press F again to exit.
5. Click a node on the canvas. Panel should slide in from the right. Press Escape to close.
6. Click a run in the bottom drawer. Run detail panel should open. Navigate the path visualization.
7. Zoom in and out on the canvas. Node detail should change with zoom level.
8. Watch live telemetry arrive. Edges should pulse. Nodes should glow and transition smoothly.
9. Open a headless flow. Should show a clean data table, not a placeholder.
10. Resize the bottom drawer by dragging. Should animate smoothly.
11. Tab through the header with keyboard only. All controls should be reachable and focusable.

---

## Open Questions

### Blocking (must resolve before dependent phases)

1. **Relay aggregation API** (blocks Phase 2.5, Phase 6): FlowsHome and MetricsView need aggregated data from Victoria — run counts, success rates, p95 latency, time-series data for sparklines. Does the relay currently expose an aggregation endpoint? If not, the phases should use mock/static data and add `// TODO: wire to useQuery when relay endpoint exists` comments. The mock data shape should match the expected API response so the swap is mechanical.

2. **Router choice** (blocks Phase 0): `BrowserRouter` requires server-side fallback (all paths serve `index.html`). For a local dev tool served by Vite, this works out of the box in dev mode. But if the built app is served from a static file server or the relay, `HashRouter` may be simpler. Decision: use `HashRouter` for local-only deployment unless the relay already serves the SPA with path fallback.

### Non-blocking (resolve during implementation)

3. **Keyboard shortcut conflicts**: Phase 5 registers `1`, `2`, `3`, `F`, `Escape` as global shortcuts. These must not fire when the user is typing in an input or the command palette. Implementation should check `document.activeElement` and skip shortcuts when a text input is focused.

4. **Existing test suite fragility**: Several phases modify `App.tsx` significantly (Phase 0 extracts FlowView, Phase 3 changes panel rendering). Existing tests that import or render `App.tsx` directly may break. Before starting Phase 0, audit existing tests to identify which ones import App.tsx and plan for how FlowView extraction affects them.

### Design defaults (use these if ambiguity arises)

- The language spec's hierarchy: Flow > Run > Node > Logs
- "Summary first, detail on demand"
- `ui/DESIGN-SYSTEM.md` for palette, primitives, typography, spacing, and anti-patterns
- When in doubt about visual design, match the Datadog/Linear pattern for that component type

## Estimated Phase Ordering

Recommended sequence on current `main`:

1. Complete the Codex foundation plan first (deps, tokens, shadcn, path aliases).
2. Execute Phase 0 (routing + Zustand store) -- invisible to users but enables everything after.
3. Execute Phases 1-2 to migrate typography, spacing, and primitives in the existing surfaces.
4. Execute Phase 2.5 (Flows Home) -- the product's landing page.
5. Execute Phases 3-4 to migrate panels and table rendering.
6. Execute Phase 8 once the side panels and tables are stable.
7. Execute Phases 5, 7, and 9 after the core migration is stable.
8. Execute Phase 6 (Metrics Mode) -- the non-graph observability view.
9. Execute Phase 7.5 (Trace Waterfall) -- run-level timing visualization.

Each phase produces a fully functional, buildable app. No phase leaves the UI in a broken state.

## Dependency Map

```
future-state.md (north star — what "done" looks like)
  ↑ every phase must serve this
PLAN-claude-ui-redesign.md (this doc — 13 phases)
  ↑ depends on
PLAN-codex-ui-foundation.md (tokens, shadcn, deps)
  ↑ depends on
Current main branch
```
