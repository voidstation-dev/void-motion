/**
 * Void Motion application entry point (M01).
 *
 * Mounts the React shell into #root. The shell renders placeholder regions
 * (Header, Canvas, Sidebar, Bottom bar) — no engine behavior is migrated yet.
 * The legacy runtime remains authoritative; this shell is a structural
 * scaffold for later migrations to fill in.
 */
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './app/globals.css'
import './engine/legacy/legacy-boot'
import '../legacy/animations.js'
import './i18n'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Void Motion: #root element not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center" role="status" aria-busy="true">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      }
    >
      <App />
    </Suspense>
  </StrictMode>,
)
