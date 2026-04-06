# UI Refactor v2 — Apple Minimal Design Pass

> **Goal:** Make resq-flow feel premium, calm, and purposeful. Color only for meaning. Whitespace as structure. Data as the hero.
>
> **Reference:** See `ui-flow-canvas-preview.html` and `ui-logs-palette-preview.html` for the approved design direction.
>
> **Scope:** 10 files across 2 parts. No new dependencies. CSS tokens + Tailwind class + component changes.
>
> **Execution:** Part 1 first, verify build + tests, then Part 2.

---

## Design Decisions (settled)

| Decision | Before | After |
|---|---|---|
| Light mode surfaces | Blue-tinted (`#f8fafc`, `#e3f2fd`) | Pure neutral white (`#ffffff`, `#f5f5f7`) |
| Light mode borders | Blue-tinted (`#90caf9`) | Neutral gray (`#e5e5ea`) |
| Light mode text hierarchy | Blue-tinted (`#4d7fa8` muted) | Pure gray (`#8e8e93` muted) |
| Dark mode surfaces | Deep navy (`#020617`) | GitHub-style dark gray (`#0d1117`) |
| Dark mode text | Blue-muted (`#4d7fa8`) | Neutral gray (`#8b949e`) |
| Log status column | `Badge` (OK / ERR pill) | 6px colored dot |
| Log node column | Plain text | Color-coded chip by node family |
| Log message column | Single string | `prefix:` (mono, muted) + body (full contrast) |
| Error log rows | No visual accent | 2px left border in `--status-error` |
| Log table card wrapper | `<Card>` wrapping table | Borderless, no card |
| Header "FLOW" label | Text label + Select | Removed label, Select stays |
| Header theme button | Standalone button (icon + text) | Moved into ⚙ settings dropdown |
| Drawer node chip filters | Horizontal scrolling chip row | Removed — search handles node filtering |
| Canvas node status | `● idle` text badge | Dot only, no text |
| Canvas node width | 200px default (variable) | 158px default (uniform) |
| Canvas node backgrounds | Opaque dark fills | Near-transparent tints (`0.03`–`0.04` opacity) |
| Dark mode chosen | — | Gray (`#0d1117`) — not slate blue |

---

# Part 1 — Theme, Logs, Header, Drawer

Everything except the canvas node/block changes. These are CSS token swaps, component tweaks, and log table redesign.

---

## 1.1: `ui/src/index.css` — Theme Token Overhaul

**Impact: High. All visual changes flow from here.**

### Light mode tokens

The current light theme (`:root[data-theme='light']`) uses Ocean Blue tints throughout. Replace with pure neutral Apple palette.

```css
/* BEFORE (current) → AFTER (target) */

/* Surfaces */
--surface-primary:  #f8fafc   →  #ffffff
--surface-raised:   #ffffff   →  #ffffff  (no change)
--surface-overlay:  #f8fafc   →  #ffffff
--surface-inset:    #e3f2fd   →  #f5f5f7

/* Borders — remove all blue tinting */
--border-default:   #90caf9              →  #e5e5ea
--border-subtle:    #bbdefb              →  #f0f0f0
--border-accent:    rgba(21,101,192,.28) →  rgba(0,0,0,0.12)

/* Text */
--text-primary:     #0a1929  →  #1d1d1f
--text-secondary:   #1e3a5f  →  #3a3a3c
--text-muted:       #4d7fa8  →  #8e8e93

/* Accent — keep blue, it's used for interactive elements */
--accent-primary:        #1565c0   (no change)
--accent-primary-hover:  #1976d2   (no change)

/* Status — adjust for neutral background */
--status-success:  #2e7d32  →  #1a8c3a   (slightly richer on white)
--status-error:    #c62828  →  #d93025
--status-idle:     #90caf9  →  #aeaeb2   (neutral gray, not blue)

/* Canvas */
--canvas-bg:   #f8fafc  →  #fafafa
--canvas-dot:  (add)    →  rgba(0, 0, 0, 0.07)
```

### Dark mode tokens

Current dark (`:root`) uses deep navy Ocean Blue. Switch to GitHub-style neutral dark gray.

```css
/* Surfaces */
--surface-primary:  #020617  →  #0d1117
--surface-raised:   #06101f  →  #161b22
--surface-overlay:  #0a1e38  →  #21262d
--surface-inset:    #000d1a  →  #0d1117

/* Borders */
--border-default:  rgba(30,58,95,0.7)  →  rgba(255,255,255,0.08)
--border-subtle:   rgba(30,58,95,0.4)  →  rgba(255,255,255,0.05)
--border-accent:   rgba(66,165,245,.4) →  rgba(255,255,255,0.12)

/* Text */
--text-primary:    #f1f5f9  →  #e6edf3
--text-secondary:  #4d7fa8  →  #8b949e
--text-muted:      #2d5986  →  #6e7681

/* Canvas */
--canvas-bg:   #020617            →  #0d1117
--canvas-dot:  rgba(30,58,95,.6)  →  rgba(130,160,200,0.07)

/* Compatibility aliases */
--color-edge:         #1e3a5f  →  #30363d
--color-edge-dimmed:  #0f2340  →  #21262d
```

### Node chip tokens (new — add to both theme blocks)

These are used by `LogsTable` for the color-coded node chips. They don't exist yet.

Light mode (add inside `:root[data-theme='light']`):
```css
--chip-worker-bg:   rgba(0,122,255,0.07);   --chip-worker-text:   #0055cc;
--chip-queue-bg:    rgba(255,149,0,0.08);   --chip-queue-text:    #995800;
--chip-cron-bg:     rgba(142,142,147,0.10); --chip-cron-text:     #48484a;
--chip-process-bg:  rgba(88,86,214,0.07);   --chip-process-text:  #3634a3;
--chip-resource-bg: rgba(0,150,150,0.07);   --chip-resource-text: #115e59;
--chip-trigger-bg:  rgba(34,197,94,0.07);   --chip-trigger-text:  #166534;
```

Dark mode (add inside `:root`):
```css
--chip-worker-bg:   rgba(10,132,255,0.12);   --chip-worker-text:   #58a6ff;
--chip-queue-bg:    rgba(255,159,10,0.12);   --chip-queue-text:    #f5a623;
--chip-cron-bg:     rgba(139,148,158,0.10);  --chip-cron-text:     #8b949e;
--chip-process-bg:  rgba(94,92,230,0.12);    --chip-process-text:  #a5b4fc;
--chip-resource-bg: rgba(0,180,180,0.10);    --chip-resource-text: #2dd4bf;
--chip-trigger-bg:  rgba(34,197,94,0.10);    --chip-trigger-text:  #4ade80;
```

### Error row accent rule (add to end of file)

```css
[data-level='error'] td:first-child {
  border-left: 2px solid var(--status-error);
  padding-left: calc(var(--spacing) * 3 - 2px);
}
```

---

## 1.2: `ui/src/core/components/LogsTable.tsx`

**Impact: High. Most visible change in the product.**

### 1.2a. Status column — Badge → dot

```tsx
// BEFORE (line ~126)
<Badge variant={row.original.entry.level === 'error' ? 'destructive' : 'success'}>
  {row.original.entry.level === 'error' ? 'ERR' : 'OK'}
</Badge>

// AFTER
<span
  className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
  style={{
    background: row.original.entry.level === 'error'
      ? 'var(--status-error)'
      : 'var(--status-success)',
  }}
/>
```

Remove `Badge` import if no longer used in this file.

### 1.2b. Status column header — remove label

```tsx
// BEFORE (line ~122)
header: 'Status',

// AFTER
header: '',   // keep column for the dot, just no header text
```

### 1.2c. Node column — plain text → color chip

Add `nodeFamilies: Map<string, string>` prop to `LogsTableProps`. Add `nodeFamily?: string` to `LogRowData`.

```tsx
// In data memo:
nodeFamily: entry.nodeId ? nodeFamilies.get(entry.nodeId) : undefined,

// Node cell (BEFORE):
<span className="block truncate text-[var(--text-secondary)]" title={...}>
  {row.original.nodeLabel}
</span>

// Node cell (AFTER):
<span
  className="inline-block rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium"
  style={{
    background: `var(--chip-${row.original.nodeFamily ?? 'cron'}-bg)`,
    color:      `var(--chip-${row.original.nodeFamily ?? 'cron'}-text)`,
  }}
>
  {row.original.nodeLabel}
</span>
```

### 1.2d. Message column — split prefix from body

Add `messagePrefix?: string` and `messageBody: string` to `LogRowData`.

```tsx
// Derive in data memo: split on first ':'
const fullMsg = getLogDisplayMessage(entry)
const colonIdx = fullMsg.indexOf(':')
const messagePrefix = colonIdx > 0 && colonIdx < 40
  ? fullMsg.slice(0, colonIdx)
  : undefined
const messageBody = colonIdx > 0 && colonIdx < 40
  ? fullMsg.slice(colonIdx + 1).trimStart()
  : fullMsg

// Message cell (AFTER):
<span className="block truncate" title={row.original.messageTitle}>
  {row.original.messagePrefix && (
    <span className="mr-1 font-mono text-[10px] text-[var(--text-muted)]">
      {row.original.messagePrefix}:
    </span>
  )}
  <span className="text-[var(--text-primary)]">{row.original.messageBody}</span>
</span>
```

### 1.2e. Error row accent — data attribute on TableRow

```tsx
// Add data-level to TableRow:
<TableRow
  key={row.id}
  data-state={selected ? 'selected' : undefined}
  data-level={row.original.entry.level}
  onClick={() => onSelectLog(row.original.entry)}
/>
```

(The CSS rule in 1.1 handles the styling.)

### 1.2f. Column widths

```tsx
<colgroup>
  <col className="w-[160px]" />   {/* Time */}
  <col className="w-[200px]" />   {/* Node */}
  <col />                          {/* Message */}
  <col className="w-[24px]" />    {/* Status dot */}
  <col className="w-[90px]" />    {/* Duration */}
</colgroup>
```

---

## 1.3: `ui/src/core/components/LogsView.tsx`

**Impact: Medium.**

### 1.3a. Remove Card wrapper

```tsx
// BEFORE (line ~201):
<Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
  <CardContent className="flex min-h-0 flex-1 flex-col pt-3">
    <ScrollArea ...> ... </ScrollArea>
  </CardContent>
</Card>

// AFTER — just the ScrollArea directly:
<ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1">
  ...
</ScrollArea>
```

Remove `Card`, `CardContent` imports.

### 1.3b. Ghost search input

```tsx
<Input
  value={search}
  onChange={(event) => setSearch(event.target.value)}
  placeholder="Search logs, nodes, or run IDs…"
  className="w-full max-w-sm border-0 bg-[var(--surface-inset)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
/>
```

### 1.3c. Pass `nodeFamilies` to LogsTable

```tsx
const nodeFamilies = useMemo(() => {
  const map = new Map<string, string>()
  flow.nodes.forEach((node) => {
    if (node.family) map.set(node.id, node.family)
  })
  return map
}, [flow.nodes])

<LogsTable
  logs={filteredLogs}
  nodeLabels={nodeLabels}
  nodeFamilies={nodeFamilies}
  ...
/>
```

> **Note:** If `FlowNode` doesn't have a `family` field, derive it from `node.style?.color` or `node.semanticRole` — check `ui/src/core/types.ts` and the flow config objects.

---

## 1.4: `ui/src/core/components/BottomLogPanel.tsx`

**Impact: Medium.**

### 1.4a. Remove horizontal node chip filter row

Delete the entire `{tab === 'logs' ? (<> ... </>)}` block (~lines 308–346) that renders the `Separator` + scrolling chip buttons.

Also remove all dead state/callbacks that only served the chip row:
- `activeNodeFilters` state
- `activeNodeIds` memo
- `toggleNodeFilter` callback
- `clearFilters` callback
- `activeNodeFilters` check in `filteredLogs` filter (~line 97)

### 1.4b. Pass `nodeFamilies` to LogsTable

Same as LogsView — build `nodeFamilies` from `flow.nodes` and pass it down.

### 1.4c. Live tail indicator

Add pulsing dot near the search input area:

```tsx
{liveTail && !collapsed ? (
  <span className="flex items-center gap-1.5 text-xs text-[var(--status-success)]">
    <span className="inline-block h-1.5 w-1.5 animate-flow-pulse rounded-full bg-[var(--status-success)]" />
    Live
  </span>
) : null}
```

### 1.4d. Collapse button — text → chevron icon

```tsx
// BEFORE:
<Button type="button" variant="ghost" size="sm" onClick={toggleCollapsed}>
  {collapsed ? 'Expand' : 'Collapse'}
</Button>

// AFTER:
<Button type="button" variant="ghost" size="icon" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}>
  <ChevronDown className={`size-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
</Button>
```

Import `ChevronDown` from `lucide-react`.

---

## 1.5: `ui/src/core/components/FlowSelector.tsx`

**Impact: Low.**

### 1.5a. Remove the "FLOW" label

Delete the `<label>Flow</label>` element (~line 112–117). Keep the `<Select>` as-is.

### 1.5b. Move theme toggle into settings dropdown

Remove the standalone theme button from the header right section (~line 177–180).

Add inside `DropdownMenuContent`, before the existing "Session" section:

```tsx
<div className="space-y-2">
  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
    Appearance
  </p>
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="w-full justify-start"
    onClick={() => { onToggleTheme(); setSettingsOpen(false) }}
  >
    {theme === 'dark' ? <SunMedium className="mr-2 size-4" /> : <MoonStar className="mr-2 size-4" />}
    Switch to {theme === 'dark' ? 'light' : 'dark'} mode
  </Button>
</div>
<DropdownMenuSeparator />
```

---

## 1.6: Test updates

- `LogsTable.test.tsx` — Badge assertions → dot assertions, add node chip/prefix assertions
- `LogsView.test.tsx` — Remove Card wrapper assertions if any

Run `pnpm test` after Part 1 to verify. Fix any failures before Part 2.

---

# Part 2 — Canvas Node / Block Changes

These change the canvas graph appearance: node sizing, status indicators, and background transparency. **Run Part 2 only after Part 1 builds and tests clean.**

---

## Implementation Notes (read before coding)

1. **StatusDot (2.1, 2.2):** Replace the entire `<div className="flex ... gap-1">` wrapper with a bare `<span>`. Don't just delete the text span — removing text but keeping the flex wrapper leaves broken layout. Move `data-testid` from the wrapper to the dot `<span>`.

2. **NodeStatusBadge (2.3):** Delete the `badgeVariant()` helper function (lines 15-26) and the `Badge` import. Keep the outer `<div className="inline-flex items-center gap-2">` wrapper and `DurationBadge` — only replace the `<Badge>` element itself with a bare `<span>` dot.

3. **Node width (2.4):** Changing 200→158 will shift auto-layout. Visually verify the mail pipeline canvas after. If a specific node needs to stay wider, add explicit `size: { width: N }` to its flow config.

4. **CSS tokens (2.5):** Each `--node-*-bg` var appears on its own line inside a larger block for that node family. Replace only the `-bg` value line — don't touch `-border`, `-text`, or `-accent` on neighboring lines.

5. **Tests:** Run `npm test -- --run` after all changes. Check `NodeStatusBadge` tests for `Badge` text assertions that may need updating.

---

## 2.1: `ui/src/core/nodes/StandardNodeContent.tsx`

**Impact: High. Every first-class canvas node renders through this.**

### Remove "idle" text label from StatusDot

The `StatusDot` component (line 42) renders a colored dot AND a text label (`idle`, `active`, etc.). Remove the text — keep only the dot.

```tsx
// BEFORE (line 50-61):
function StatusDot({ status }: { status: NodeStatus }) {
  // ...
  return (
    <div className="flex shrink-0 items-center gap-1" data-testid={`status-badge-${status}`}>
      <span className={clsx('size-1.5 rounded-full', dotColor, ...)} />
      <span className="text-[9px] leading-none opacity-60">{status}</span>  // ← DELETE THIS LINE
    </div>
  )
}

// AFTER:
function StatusDot({ status }: { status: NodeStatus }) {
  // ...
  return (
    <span
      className={clsx('size-1.5 shrink-0 rounded-full', dotColor, status === 'active' && 'node-dot-pulse')}
      data-testid={`status-badge-${status}`}
    />
  )
}
```

Simplify from `<div>` wrapper to bare `<span>` dot — no text neighbor means no gap needed.

---

## 2.2: `ui/src/core/nodes/CylinderNode.tsx`

**Impact: Low. Only resource nodes (postgres, S3, redis).**

### CylinderStatusDot — same fix

Same pattern as StandardNodeContent. The `CylinderStatusDot` component (line 21) renders dot + text. Remove the text span (line 32), simplify wrapper to bare dot.

---

## 2.3: `ui/src/core/components/NodeStatusBadge.tsx`

**Impact: Medium. Used by CircleNode, OctagonNode, DiamondNode.**

This component renders a full `<Badge>` pill with dot + text label (e.g. `● idle`). Replace the Badge with a bare dot.

```tsx
// BEFORE (lines 37-54):
return (
  <div className={clsx('inline-flex items-center gap-2', className)}>
    <Badge variant={badgeVariant(status)} className="gap-1.5 px-2.5 py-0.5 capitalize">
      <span className={clsx('size-2 rounded-full bg-current', ...)} />
      <span>{status}</span>
    </Badge>
    <DurationBadge durationMs={durationMs} faded={faded} />
  </div>
)

// AFTER:
return (
  <div className={clsx('inline-flex items-center gap-2', className)}>
    <span
      data-testid={`status-badge-${status}`}
      className={clsx(
        'size-1.5 rounded-full',
        status === 'idle'    && 'bg-[var(--status-idle)]',
        status === 'active'  && 'bg-[var(--status-active)] animate-flow-pulse',
        status === 'success' && 'bg-[var(--status-success)]',
        status === 'error'   && 'bg-[var(--status-error)]',
      )}
    />
    <DurationBadge durationMs={durationMs} faded={faded} />
  </div>
)
```

Remove `Badge` import and `badgeVariant` function. Keep `DurationBadge`.

---

## 2.4: `ui/src/core/components/FlowCanvas.tsx`

**Impact: Medium. Controls node sizing for the entire graph layout.**

### Default node width — 200px → 158px

```tsx
// BEFORE (line 142-147):
function nodeDimensions(node: FlowConfig['nodes'][number]) {
  return {
    width: node.size?.width ?? 200,
    height: ...
  }
}

// AFTER:
function nodeDimensions(node: FlowConfig['nodes'][number]) {
  return {
    width: node.size?.width ?? 158,
    height: ...
  }
}
```

Nodes with explicit `size.width` in flow configs are unaffected.

> **Warning:** This will shift auto-layout positions. Verify the mail pipeline canvas visually after this change. If specific nodes need to be wider, add `size: { width: N }` to their flow config entry.

---

## 2.5: `ui/src/index.css` — Node Background Tokens

### Dark mode node backgrounds — solid → transparent

```css
/* BEFORE → AFTER */
--node-queue-bg:      #150c00   →  rgba(255, 168, 0, 0.04)
--node-worker-bg:     #000d18   →  rgba(56, 182, 255, 0.04)
--node-cron-bg:       #0b1320   →  rgba(148, 163, 184, 0.04)
--node-process-bg:    #011120   →  rgba(96, 165, 250, 0.04)
--node-decision-bg:   #0d0018   →  rgba(160, 100, 255, 0.04)
--node-resource-bg:   #001414   →  rgba(0, 180, 180, 0.04)
--node-trigger-bg:    #04150b   →  rgba(34, 197, 94, 0.04)
--node-detail-bg:     #070d16   →  rgba(148, 163, 184, 0.03)
```

### Light mode node backgrounds — white → subtle tints

```css
--node-queue-bg:      #ffffff   →  rgba(255, 149, 0, 0.03)
--node-worker-bg:     #ffffff   →  rgba(0, 122, 255, 0.03)
--node-cron-bg:       #ffffff   →  rgba(142, 142, 147, 0.03)
--node-process-bg:    #ffffff   →  rgba(88, 86, 214, 0.03)
--node-decision-bg:   #ffffff   →  rgba(130, 70, 220, 0.03)
--node-resource-bg:   #ffffff   →  rgba(0, 150, 150, 0.03)
--node-trigger-bg:    #ffffff   →  rgba(34, 197, 94, 0.03)
--node-detail-bg:     #ffffff   →  rgba(0, 0, 0, 0.02)
```

### Group container transparency

The CSS variables already set `--node-group-bg: transparent`. If groups still render with a visible gray fill, add:

```css
.react-flow__node-group { background: transparent !important; }
```

---

## 2.6: Verify

After Part 2, run `pnpm test` and visually check the mail pipeline canvas in both light and dark mode. Key things to verify:
- Nodes are uniform width (~158px)
- Status shows as dot only (no "idle" text)
- Node backgrounds are subtle tints, not solid fills
- Group containers have transparent backgrounds with dashed borders
- Auto-layout didn't break (nodes don't overlap)

---

# What's NOT changing

- `InspectorPanel.tsx` / `NodeDetailPanel.tsx` / `TraceDetailPanel.tsx` — already clean
- `RunsTable.tsx` — acceptable as-is
- Any routing, data fetching, or state logic
- `GroupNode.tsx` — already uses `--node-group-bg` which is `transparent`

---

# Future / Next Iteration — Bottom Drawer

The current drawer is a fixed-height panel that splits the canvas vertically. Some friction:
- Takes permanent vertical space even when you're not watching logs
- The expand/collapse interaction is a bit blunt

**Options to consider (not scheduled):**

1. **Inline row expand** — clicking a log row expands it inline (accordion), no panel at all. Keeps full canvas visible. Works well for occasional inspection.

2. **Floating overlay panel** — drawer floats over the canvas bottom edge (`position: absolute, bottom: 0`) at a fixed translucent height, without pushing the canvas up. Canvas stays full height.

3. **Keep drawer but make it feel lighter** — current direction, just with the chip row removed and the visual treatment updated. This is what v2 implements.

Option 3 is what we're building now. Option 1 or 2 is worth revisiting once the v2 visual pass is complete and we see how it feels in daily use.
