import { create } from 'zustand'

import type { ThemeMode } from '../core/types'

export const THEME_STORAGE_KEY = 'resq-flow-theme'

export type BottomPanelTab = 'logs' | 'traces'
export type BottomPanelSnap = 'whisper' | 'partial' | 'full'

export const SNAP_WHISPER = '48px' as const
export const SNAP_PARTIAL = 0.3
export const SNAP_FULL = 1

export const SNAP_POINTS = [SNAP_WHISPER, SNAP_PARTIAL, SNAP_FULL] as const
export type SnapPoint = (typeof SNAP_POINTS)[number]

export interface LayoutState {
  sidebarOpen: boolean
  focusMode: boolean
  commandPaletteOpen: boolean
  bottomPanelSnap: BottomPanelSnap
  bottomPanelTab: BottomPanelTab
  theme: ThemeMode
  setSidebarOpen: (open: boolean) => void
  toggleFocusMode: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setBottomPanelSnap: (snap: BottomPanelSnap) => void
  setBottomPanelTab: (tab: BottomPanelTab) => void
  setTheme: (theme: ThemeMode) => void
}

export function snapToPoint(snap: BottomPanelSnap): SnapPoint {
  if (snap === 'whisper') return SNAP_WHISPER
  if (snap === 'partial') return SNAP_PARTIAL
  return SNAP_FULL
}

export function pointToSnap(point: SnapPoint | number | string | null): BottomPanelSnap {
  if (point === SNAP_FULL || point === 1) return 'full'
  if (point === SNAP_PARTIAL || point === 0.3) return 'partial'
  return 'whisper'
}

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  focusMode: false,
  commandPaletteOpen: false,
  bottomPanelSnap: 'partial',
  bottomPanelTab: 'logs',
  theme: resolveInitialTheme(),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setBottomPanelSnap: (snap) => set({ bottomPanelSnap: snap }),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }

    set({ theme })
  },
}))
