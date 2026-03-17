import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MoonStar, Settings2, SunMedium } from 'lucide-react'

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'

import type { FlowConfig, FlowViewMode, ThemeMode } from '../types'

interface FlowSelectorProps {
  flows: FlowConfig[]
  currentFlowId: string
  connected: boolean
  reconnecting: boolean
  relayWsUrl: string
  displayedEventCount: number
  totalEventCount: number
  queuedEventCount: number
  playbackPaused: boolean
  playbackSpeed: number
  viewMode: FlowViewMode
  availableViewModes: FlowViewMode[]
  focusMode: boolean
  focusActivePath: boolean
  theme: ThemeMode
  historyMode: boolean
  historyLoading: boolean
  historyWindow: string
  historyQuery: string
  historySummary?: string
  historyError?: string
  onSelectFlow: (flowId: string) => void
  onPlaybackPauseToggle: () => void
  onPlaybackStep: () => void
  onPlaybackSpeedChange: (speed: number) => void
  onViewModeChange: (viewMode: FlowViewMode) => void
  onToggleFocusMode: () => void
  onToggleFocusActivePath: () => void
  onToggleTheme: () => void
  onHistoryWindowChange: (window: string) => void
  onHistoryQueryChange: (query: string) => void
  onLoadHistory: () => void
  onExitHistory: () => void
  onClearSession: () => void
}

const playbackSpeedOptions = [0.25, 0.5, 1, 2, 4, 8]
const historyWindowOptions = [
  { value: '15m', label: 'Last 15m' },
  { value: '30m', label: 'Last 30m' },
  { value: '1h', label: 'Last 1h' },
  { value: '6h', label: 'Last 6h' },
  { value: '24h', label: 'Last 24h' },
]

function modeBadgeVariant(historyMode: boolean) {
  return historyMode ? 'warning' : 'success'
}

export function FlowSelector({
  flows,
  currentFlowId,
  connected,
  reconnecting,
  relayWsUrl,
  displayedEventCount,
  totalEventCount,
  queuedEventCount,
  playbackPaused,
  playbackSpeed,
  viewMode,
  availableViewModes,
  focusMode,
  focusActivePath,
  theme,
  historyMode,
  historyLoading,
  historyWindow,
  historyQuery,
  historySummary,
  historyError,
  onSelectFlow,
  onPlaybackPauseToggle,
  onPlaybackStep,
  onPlaybackSpeedChange,
  onViewModeChange,
  onToggleFocusMode,
  onToggleFocusActivePath,
  onToggleTheme,
  onHistoryWindowChange,
  onHistoryQueryChange,
  onLoadHistory,
  onExitHistory,
  onClearSession,
}: FlowSelectorProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const connectionLabel = connected
    ? 'Connected'
    : reconnecting
      ? 'Reconnecting…'
      : 'Disconnected'
  const connectionTooltip = connected
    ? `Connected to relay server at ${relayWsUrl}`
    : reconnecting
      ? `Reconnecting to relay server at ${relayWsUrl}`
      : `Disconnected from relay server at ${relayWsUrl}`
  const showCanvasControls = viewMode === 'canvas' && availableViewModes.includes('canvas')

  return (
    <TooltipProvider>
      <header className="relative z-50 grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-raised)]/95 px-4 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <label
              className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
              htmlFor="flow-select"
            >
              Flow
            </label>
            <Select value={currentFlowId} onValueChange={onSelectFlow}>
              <SelectTrigger id="flow-select" className="h-9 w-[220px] min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {flows.map((flow) => (
                  <SelectItem key={flow.id} value={flow.id}>
                    {flow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  aria-label={connectionLabel}
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    connected
                      ? 'bg-[var(--status-success)]'
                      : reconnecting
                        ? 'animate-flow-pulse bg-[var(--status-warning)]'
                        : 'bg-[var(--status-error)]'
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent>{connectionTooltip}</TooltipContent>
            </Tooltip>
            <span className="text-sm text-[var(--text-secondary)]">{connectionLabel}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as FlowViewMode)}>
            <TabsList>
              {availableViewModes.map((mode) => (
                <TabsTrigger key={mode} value={mode}>
                  {mode === 'canvas' ? 'Canvas' : mode === 'metrics' ? 'Metrics' : 'Logs'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Badge variant={modeBadgeVariant(historyMode)} className="px-3 py-1 text-sm font-normal">
            {historyMode ? 'History' : 'Live'}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-sm font-normal">
            {displayedEventCount}/{totalEventCount} events
            {queuedEventCount > 0 ? ` (${queuedEventCount} queued)` : ''}
          </Badge>

          <AnimatePresence initial={false}>
            {historyMode ? (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)]/40 px-2 py-1"
              >
                <label
                  htmlFor="playback-speed"
                  className="text-xs uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Speed
                </label>
                <Select
                  value={String(playbackSpeed)}
                  onValueChange={(value) => onPlaybackSpeedChange(Number.parseFloat(value))}
                >
                  <SelectTrigger id="playback-speed" className="h-8 w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {playbackSpeedOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button type="button" variant="outline" size="sm" onClick={onPlaybackPauseToggle}>
                  {playbackPaused ? 'Resume' : 'Pause'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPlaybackStep}
                  disabled={queuedEventCount === 0}
                >
                  Step
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-end gap-2">
          {showCanvasControls ? (
            <Toggle
              size="sm"
              pressed={focusMode}
              onPressedChange={onToggleFocusMode}
              aria-label="Toggle focus mode"
            >
              Focus
            </Toggle>
          ) : null}

          <Button type="button" variant="ghost" size="sm" onClick={onToggleTheme}>
            {theme === 'dark' ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>

          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open settings">
                <Settings2 className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="space-y-3 p-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Session
                  </p>
                  {showCanvasControls ? (
                    <Button
                      type="button"
                      variant={focusActivePath ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        onToggleFocusActivePath()
                        setSettingsOpen(false)
                      }}
                    >
                      Focus active path: {focusActivePath ? 'on' : 'off'}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      onClearSession()
                      setSettingsOpen(false)
                    }}
                  >
                    Clear session
                  </Button>
                </div>

                <DropdownMenuSeparator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    History
                  </p>
                  <Select value={historyWindow} onValueChange={onHistoryWindowChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {historyWindowOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={historyQuery}
                    onChange={(event) => onHistoryQueryChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !historyLoading) {
                        onLoadHistory()
                        setSettingsOpen(false)
                      }
                    }}
                    placeholder="trace/job/thread id (optional)"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={historyLoading}
                    onClick={() => {
                      onLoadHistory()
                      setSettingsOpen(false)
                    }}
                  >
                    {historyLoading ? 'Loading…' : 'Load history window'}
                  </Button>

                  {historyMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        onExitHistory()
                        setSettingsOpen(false)
                      }}
                    >
                      Return to live
                    </Button>
                  ) : null}

                  {historySummary ? (
                    <p className="text-xs text-[var(--text-secondary)]">{historySummary}</p>
                  ) : null}
                  {historyError ? (
                    <p className="text-xs text-[var(--status-error)]">{historyError}</p>
                  ) : null}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  )
}
