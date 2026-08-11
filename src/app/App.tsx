/**
 * Void Motion application shell (M02).
 *
 * Renders the four regions that mirror the legacy Inkplainer layout: Header,
 * Canvas, Sidebar, Bottom bar. These remain structural scaffolds — no behavior
 * is wired up yet — but are now styled with Tailwind tokens derived from the
 * legacy palette so the shell visually approximates the legacy frame.
 *
 * Layout matches legacy/index.html: a top header (52px), a main area split
 * into canvas (left/center) and sidebar (right ~280px), and a bottom bar
 * spanning the width.
 */
import type { ReactElement } from 'react'
import { Providers } from './providers'
import { Header } from './regions/Header'
import { CanvasRegion } from './regions/CanvasRegion'
import { Sidebar } from './regions/Sidebar'
import { BottomBar } from './regions/BottomBar'

export function App(): ReactElement {
  return (
    <Providers>
      <div className="flex h-full flex-col bg-background text-foreground">
        <Header />
        <div className="flex min-h-0 flex-1">
          <CanvasRegion />
          <Sidebar />
        </div>
        <BottomBar />
      </div>
    </Providers>
  )
}
