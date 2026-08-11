/**
 * Void Motion application entry point (M01).
 *
 * Mounts the React shell into #root. The shell renders placeholder regions
 * (Header, Canvas, Sidebar, Bottom bar) — no engine behavior is migrated yet.
 * The legacy runtime remains authoritative; this shell is a structural
 * scaffold for later migrations to fill in.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './app/globals.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Void Motion: #root element not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
