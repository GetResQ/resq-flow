import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_BOTTOM_PANEL_HEIGHT,
  THEME_STORAGE_KEY,
  useLayoutStore,
} from '../layout'

describe('useLayoutStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useLayoutStore.setState({
      sidebarOpen: true,
      focusMode: false,
      commandPaletteOpen: false,
      bottomPanelHeight: DEFAULT_BOTTOM_PANEL_HEIGHT,
      bottomPanelTab: 'logs',
      theme: 'dark',
    })
  })

  it('starts with the expected defaults', () => {
    const state = useLayoutStore.getState()

    expect(state.sidebarOpen).toBe(true)
    expect(state.focusMode).toBe(false)
    expect(state.theme).toBe('dark')
    expect(state.bottomPanelHeight).toBe(DEFAULT_BOTTOM_PANEL_HEIGHT)
    expect(state.bottomPanelTab).toBe('logs')
  })

  it('toggles focus mode', () => {
    useLayoutStore.getState().toggleFocusMode()
    expect(useLayoutStore.getState().focusMode).toBe(true)

    useLayoutStore.getState().toggleFocusMode()
    expect(useLayoutStore.getState().focusMode).toBe(false)
  })

  it('updates theme state and localStorage', () => {
    useLayoutStore.getState().setTheme('light')

    expect(useLayoutStore.getState().theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('stores the bottom panel height', () => {
    useLayoutStore.getState().setBottomPanelHeight(320)

    expect(useLayoutStore.getState().bottomPanelHeight).toBe(320)
  })

  it('stores the bottom panel tab', () => {
    useLayoutStore.getState().setBottomPanelTab('traces')

    expect(useLayoutStore.getState().bottomPanelTab).toBe('traces')
  })
})
