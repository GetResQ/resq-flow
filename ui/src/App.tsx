import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { CommandPalette } from './core/components/CommandPalette'
import { FlowsHome } from './core/components/FlowsHome'
import { FlowView } from './core/components/FlowView'
import { useKeyboardShortcuts } from './core/hooks/useKeyboardShortcuts'
import type { ThemeMode } from './core/types'
import { flows } from './flows'
import { resolveDocumentTitle } from './lib/documentTitle'
import { useLayoutStore } from './stores/layout'

function applyTheme(theme: ThemeMode) {
  const apply = () => {
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme
  }

  if (!document.startViewTransition) {
    apply()
    return
  }

  document.startViewTransition(apply)
}

function App() {
  const theme = useLayoutStore((state) => state.theme)
  const defaultFlowId = flows[0]?.id
  const location = useLocation()

  useKeyboardShortcuts()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    document.title = resolveDocumentTitle(location.pathname, flows)
  }, [location.pathname])

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
