import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { CommandPalette } from './core/components/CommandPalette'
import { FlowsHome } from './core/components/FlowsHome'
import { FlowView } from './core/components/FlowView'
import { useKeyboardShortcuts } from './core/hooks/useKeyboardShortcuts'
import type { ThemeMode } from './core/types'
import { flows } from './flows'
import { useLayoutStore } from './stores/layout'

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  document.body.dataset.theme = theme
}

function App() {
  const theme = useLayoutStore((state) => state.theme)
  const defaultFlowId = flows[0]?.id

  useKeyboardShortcuts()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  if (!defaultFlowId) {
    return null
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<FlowsHome />} />
        <Route path="/flows/:flowId" element={<FlowView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CommandPalette />
    </>
  )
}

export default App
