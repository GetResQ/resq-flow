import { useState } from 'react'
import { MoonStar, RotateCcw, Settings2, SunMedium } from 'lucide-react'

import {
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui'

import type { ThemeMode } from '../types'

interface HudControlsPillProps {
  showCanvasControls: boolean
  focusActivePath: boolean
  theme: ThemeMode
  historyMode: boolean
  historyLoading: boolean
  historyWindow: string
  historyQuery: string
  historySummary?: string
  historyError?: string
  onToggleFocusActivePath: () => void
  onToggleTheme: () => void
  onResetLayout: () => void
  onHistoryWindowChange: (window: string) => void
  onHistoryQueryChange: (query: string) => void
  onLoadHistory: () => void
  onExitHistory: () => void
  onClearSession: () => void
}

const historyWindowOptions = [
  { value: '15m', label: 'Last 15m' },
  { value: '30m', label: 'Last 30m' },
  { value: '1h', label: 'Last 1h' },
  { value: '6h', label: 'Last 6h' },
  { value: '24h', label: 'Last 24h' },
]

export function HudControlsPill({
  showCanvasControls,
  focusActivePath,
  theme,
  historyMode,
  historyLoading,
  historyWindow,
  historyQuery,
  historySummary,
  historyError,
  onToggleFocusActivePath,
  onToggleTheme,
  onResetLayout,
  onHistoryWindowChange,
  onHistoryQueryChange,
  onLoadHistory,
  onExitHistory,
  onClearSession,
}: HudControlsPillProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={onToggleTheme}
          >
            {theme === 'dark'
              ? <SunMedium className="size-4 transition-transform duration-150 ease-out" />
              : <MoonStar className="size-4 transition-transform duration-150 ease-out" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
      </Tooltip>

      <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Open settings">
            <Settings2 className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="space-y-3 p-2">
            {showCanvasControls ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Canvas
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      onResetLayout()
                      setSettingsOpen(false)
                    }}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Reset to default layout
                  </Button>
                </div>
              </>
            ) : null}

            <DropdownMenuSeparator />

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
  )
}
