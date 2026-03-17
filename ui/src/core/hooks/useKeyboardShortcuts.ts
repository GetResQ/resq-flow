import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { useCommandPaletteStore } from '../../stores/commandPalette'
import { useLayoutStore } from '../../stores/layout'

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export function useKeyboardShortcuts() {
  const location = useLocation()
  const commandPaletteOpen = useLayoutStore((state) => state.commandPaletteOpen)
  const setCommandPaletteOpen = useLayoutStore((state) => state.setCommandPaletteOpen)
  const onSelectViewMode = useCommandPaletteStore((state) => state.onSelectViewMode)
  const onToggleFocusMode = useCommandPaletteStore((state) => state.onToggleFocusMode)
  const onEscape = useCommandPaletteStore((state) => state.onEscape)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
        return
      }

      if (event.key === 'Escape') {
        if (commandPaletteOpen) {
          event.preventDefault()
          setCommandPaletteOpen(false)
          return
        }

        onEscape?.()
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isTextInputTarget(event.target)) {
        return
      }

      if (key === 'f') {
        event.preventDefault()
        onToggleFocusMode?.()
        return
      }

      if (!location.pathname.startsWith('/flows/')) {
        return
      }

      if (key === '1') {
        event.preventDefault()
        onSelectViewMode?.('canvas')
      }

      if (key === '2') {
        event.preventDefault()
        onSelectViewMode?.('metrics')
      }

      if (key === '3') {
        event.preventDefault()
        onSelectViewMode?.('logs')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandPaletteOpen, location.pathname, onEscape, onSelectViewMode, onToggleFocusMode, setCommandPaletteOpen])
}
