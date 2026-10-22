import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import { registerOffline } from './offline.ts'
import { applyTheme, readTheme } from './theme.ts'

// Before the first paint, so a white theme never flashes dark.
applyTheme(readTheme())
registerOffline()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
