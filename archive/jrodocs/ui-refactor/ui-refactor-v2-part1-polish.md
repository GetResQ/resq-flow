# Part 1 Polish — HTML Preview Alignment

> Gaps between the approved HTML previews and the Part 1 implementation.
> 8 items, ordered by impact. Each has exact code/class references.

---

## P1. Drawer search input — apply ghost styling

**File:** `ui/src/core/components/BottomLogPanel.tsx`

**Current (line ~302-306):**
```tsx
<Input
  placeholder={tab === 'logs' ? 'Search logs…' : 'Search runs…'}
  value={search}
  onChange={(event) => setSearch(event.target.value)}
  className="h-9 w-48"
/>
```

**After:**
```tsx
<Input
  placeholder={tab === 'logs' ? 'Search logs…' : 'Search runs…'}
  value={search}
  onChange={(event) => setSearch(event.target.value)}
  className="h-9 w-48 border-0 bg-[var(--surface-inset)] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
/>
```

Same ghost pattern already used in `LogsView.tsx` line 171.

---

## P2. Drawer — add All/Error status filter

**File:** `ui/src/core/components/BottomLogPanel.tsx`

We removed the old chip filter row but the HTML preview still shows an All/Error status filter in the drawer toolbar. Need to add it back as a segmented control (see P3 for styling).

### 2a. Add state

Add to the component's state declarations (near line ~63):
```tsx
const [statusFilter, setStatusFilter] = useState<'all' | 'error'>('all')
```

### 2b. Update filteredLogs

In the `filteredLogs` memo, add a status filter check. Insert after the `selectedTraceId` check:
```tsx
if (statusFilter !== 'all' && entry.level !== statusFilter) {
  return false
}
```

### 2c. Add to toolbar

Insert the segmented control in the drawer toolbar's right controls area, **between** the search input and the live indicator. The order should be:

```
[Logs · N] [Runs · N]          [● Live] [Search…] [All|Error] [⌄]
```

Wait — looking at the HTML preview more carefully, the order is:

```
[Logs 175] | [Runs 2]          [⌕ Search…] [All|Error] [● Live] [⌃]
```

So the filter group goes **after** search, **before** Live. Place the JSX in the `drawer-r` area accordingly:

```tsx
<div className="ml-auto flex shrink-0 items-center gap-2">
  {/* ... Show all toggle for runs tab ... */}
  <Input ... />          {/* search — already exists */}

  {/* NEW: status filter (only on logs tab) */}
  {tab === 'logs' ? (
    <div className="flex items-center overflow-hidden rounded-lg bg-[var(--surface-inset)]">
      {(['all', 'error'] as const).map((status) => (
        <button
          key={status}
          type="button"
          className={`px-3 py-1 text-[10px] font-medium capitalize ${
            statusFilter === status
              ? 'rounded-lg bg-[var(--text-primary)] text-[var(--surface-primary)]'
              : 'bg-transparent text-[var(--text-muted)]'
          }`}
          onClick={() => setStatusFilter(status)}
        >
          {status}
        </button>
      ))}
    </div>
  ) : null}

  {/* live indicator — already exists */}
  {/* chevron — already exists */}
</div>
```

---

## P3. Segmented control styling for All/Error (LogsView + Drawer)

**Files:** `ui/src/core/components/LogsView.tsx`, `ui/src/core/components/BottomLogPanel.tsx`

The HTML preview uses a shared-background pill with inverted active state — not individual `<Button>` components.

### CSS from HTML:
```
Container: flex, rounded-lg, overflow-hidden, bg surface-inset
Inactive:  bg transparent, text muted
Active:    bg text-primary, text surface-primary, rounded-lg
```

### LogsView change

**Current (lines 188-200):**
```tsx
<div className="flex items-center gap-2">
  {(['all', 'error'] as const).map((status) => (
    <Button
      key={status}
      type="button"
      variant={statusFilter === status ? 'default' : 'outline'}
      size="sm"
      onClick={() => setStatusFilter(status)}
    >
      {status}
    </Button>
  ))}
</div>
```

**After:**
```tsx
<div className="flex items-center overflow-hidden rounded-lg bg-[var(--surface-inset)]">
  {(['all', 'error'] as const).map((status) => (
    <button
      key={status}
      type="button"
      className={`px-3 py-1 text-[10px] font-medium capitalize ${
        statusFilter === status
          ? 'rounded-lg bg-[var(--text-primary)] text-[var(--surface-primary)]'
          : 'bg-transparent text-[var(--text-muted)]'
      }`}
      onClick={() => setStatusFilter(status)}
    >
      {status}
    </button>
  ))}
</div>
```

Use the exact same pattern for the drawer (P2).

---

## P4. Live tail — green-tinted button style

**Files:** `ui/src/core/components/LogsView.tsx`, `ui/src/core/components/BottomLogPanel.tsx`

The HTML preview shows the Live control as a green-tinted pill with a pulsing dot when active. Not a standard shadcn `<Button>`.

### HTML reference:
```css
.live-btn { border: none; border-radius: 8px; padding: 4px 11px; font-size: 10px; font-weight: 500; display: flex; align-items: center; gap: 5px; }
.light .live-btn { background: rgba(48,209,88,0.1); color: #1a8c3a; }
.dark  .live-btn { background: rgba(48,209,88,0.12); color: #30d158; }
```

### LogsView change

**Current (lines 202-210):**
```tsx
<Button
  type="button"
  variant={liveTail ? 'secondary' : 'outline'}
  size="sm"
  onClick={() => setLiveTail((previous) => !previous)}
  disabled={sourceMode !== 'live'}
>
  Live tail {liveTail ? 'on' : 'off'}
</Button>
```

**After:**
```tsx
<button
  type="button"
  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-medium ${
    liveTail
      ? 'bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] text-[var(--status-success)]'
      : 'bg-[var(--surface-inset)] text-[var(--text-muted)]'
  }`}
  onClick={() => setLiveTail((previous) => !previous)}
  disabled={sourceMode !== 'live'}
>
  {liveTail ? (
    <span className="inline-block h-1.5 w-1.5 animate-flow-pulse rounded-full bg-[var(--status-success)]" />
  ) : null}
  Live
</button>
```

### BottomLogPanel change

**Current (lines 291-296):** Inline `<span>` indicator that only shows when live tail is on.

**After:** Replace the inline indicator with the same styled button. It should always be visible (not just when liveTail is on), so the user can toggle it. Place it between the status filter and the chevron:

```tsx
{tab === 'logs' ? (
  <button
    type="button"
    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-medium ${
      liveTail
        ? 'bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] text-[var(--status-success)]'
        : 'bg-[var(--surface-inset)] text-[var(--text-muted)]'
    }`}
    onClick={() => setLiveTail((prev) => !prev)}
  >
    {liveTail ? (
      <span className="inline-block h-1.5 w-1.5 animate-flow-pulse rounded-full bg-[var(--status-success)]" />
    ) : null}
    Live
  </button>
) : null}
```

Remove the old `{tab === 'logs' && liveTail && !collapsed ? ( <span>...Live</span> ) : null}` block.

---

## P5. DurationBadge — pill → plain mono text

**File:** `ui/src/core/components/DurationBadge.tsx`

### Current:
Renders as a colored pill: `rounded-full px-3 py-1.5 ring-1` with hardcoded Tailwind colors (`bg-emerald-900/35`, `bg-amber-900/35`, `bg-rose-900/40`).

### HTML reference:
Plain monospace text, no background/ring/pill. Amber color for slow values, neutral for normal.
```css
.dur { font-family: mono; font-size: 10px; }
.light .dur      { color: #aeaeb2; }
.light .dur.slow { color: #ff9500; font-weight: 500; }
.dark  .dur      { color: #6e7681; }
.dark  .dur.slow { color: #ff9f0a; font-weight: 500; }
```

### After:
```tsx
export function DurationBadge({
  durationMs,
  warningMs = 1_000,
  faded = false,
  className,
}: DurationBadgeProps) {
  if (typeof durationMs !== 'number') {
    return null
  }

  const isSlow = durationMs >= warningMs

  return (
    <span
      data-testid="duration-badge"
      className={clsx(
        'font-mono text-[10px]',
        isSlow
          ? 'font-medium text-[var(--status-warning)]'
          : 'text-[var(--text-muted)]',
        faded && 'opacity-65',
        className,
      )}
    >
      {formatDurationLabel(durationMs)}
    </span>
  )
}
```

Remove the `criticalMs` parameter — the HTML just has normal vs slow (two tiers, not three). Remove the `ring-1 rounded-full px-3 py-1.5` styling entirely. Keep `data-testid="duration-badge"` for test compat.

**Also update the interface** — remove `criticalMs` from `DurationBadgeProps` (or just stop using it). Check if any callers pass `criticalMs` — if so, remove those props too.

---

## P6. Drawer handle — capsule bar

**File:** `ui/src/core/components/BottomLogPanel.tsx`

**Current (line ~268-270):**
```tsx
<div
  className="flex h-1 cursor-row-resize items-center justify-center bg-[var(--border-subtle)] hover:bg-[var(--border-accent)]"
  onMouseDown={onDragStart}
/>
```

**After:**
```tsx
<div
  className="flex h-5 cursor-row-resize items-center justify-center"
  onMouseDown={onDragStart}
>
  <div className="h-[3px] w-8 rounded-full bg-[var(--text-muted)] opacity-30" />
</div>
```

Taller hit area (h-5 = 20px), centered capsule handle inside.

---

## P7. Drawer tab count chips

**File:** `ui/src/core/components/BottomLogPanel.tsx`

**Current (lines ~280-287):**
```tsx
<TabsTrigger value="logs" className="whitespace-nowrap">
  Logs
  <span className="ml-1.5 text-[var(--text-secondary)]">· {filteredLogs.length}</span>
</TabsTrigger>
```

**After:**
```tsx
<TabsTrigger value="logs" className="whitespace-nowrap">
  Logs
  <span className="ml-1.5 rounded-[5px] bg-[var(--surface-inset)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
    {filteredLogs.length}
  </span>
</TabsTrigger>
```

Same for the Runs tab trigger. The HTML preview shows active tabs with inverted count chips (`bg-[var(--text-primary)] text-[var(--surface-primary)]`), but that requires detecting active tab state on the chip. Since Radix `TabsTrigger` applies `data-state="active"`, this can be done with a CSS rule if desired, but the basic chip is the main visual win.

Optional CSS enhancement (add to `index.css`):
```css
[data-state='active'] .tab-count-chip {
  background: var(--text-primary);
  color: var(--surface-primary);
}
```
Then add `tab-count-chip` class to the count spans.

---

## P8. Search input icon (optional polish)

**Files:** `ui/src/core/components/LogsView.tsx`, `ui/src/core/components/BottomLogPanel.tsx`

Low priority. The HTML preview shows a `⌕` magnifying glass icon inside the search input's left padding. Achievable by wrapping the `<Input>` in a `relative` div and absolutely positioning a `<Search>` icon from lucide-react.

```tsx
import { Search } from 'lucide-react'

<div className="relative w-full max-w-sm">
  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
  <Input
    value={search}
    onChange={(event) => setSearch(event.target.value)}
    placeholder="Search logs, nodes, or run IDs…"
    className="border-0 bg-[var(--surface-inset)] pl-8 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
  />
</div>
```

Apply same pattern to BottomLogPanel search, but with `w-48` instead of `max-w-sm`.

---

## Execution order

1. **P5** (DurationBadge) — standalone component, no deps
2. **P3** (segmented control in LogsView) — LogsView only
3. **P4** (live tail button in LogsView) — LogsView only
4. **P1** (drawer ghost search) — BottomLogPanel
5. **P2** (drawer status filter) — BottomLogPanel, uses P3 styling
6. **P4** (live tail button in drawer) — BottomLogPanel
7. **P6** (drawer handle) — BottomLogPanel, one-liner
8. **P7** (tab count chips) — BottomLogPanel
9. **P8** (search icon) — both files, optional

Run `pnpm test` after all changes. Key test to watch: `DurationBadge` — check if any tests assert on `ring-1` or the old color classes.
