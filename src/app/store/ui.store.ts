/**
 * UI store (M04) — bounded Zustand domain store for ephemeral UI state.
 *
 * Holds transient shell state that does NOT belong in the project document:
 * which sidebar tab is active, whether the project list sheet is open, theme,
 * toast queue. Per M04: serializable only; no runtime objects.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type SidebarTab = 'animation' | 'drawing'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Toast {
  readonly id: string
  readonly message: string
  readonly tone: 'info' | 'success' | 'warning' | 'error'
}

export interface UiState {
  readonly activeSidebarTab: SidebarTab
  readonly projectListOpen: boolean
  readonly exportDialogOpen: boolean
  readonly theme: ThemeMode
  readonly toasts: readonly Toast[]

  // ── actions ──
  setSidebarTab(tab: SidebarTab): void
  setProjectListOpen(open: boolean): void
  setExportDialogOpen(open: boolean): void
  setTheme(theme: ThemeMode): void
  pushToast(toast: Toast): void
  dismissToast(id: string): void
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    activeSidebarTab: 'animation',
    projectListOpen: false,
    exportDialogOpen: false,
    theme: 'light',
    toasts: [],

    setSidebarTab(tab) {
      set((s) => {
        s.activeSidebarTab = tab
      })
    },
    setProjectListOpen(open) {
      set((s) => {
        s.projectListOpen = open
      })
    },
    setExportDialogOpen(open) {
      set((s) => {
        s.exportDialogOpen = open
      })
    },
    setTheme(theme) {
      set((s) => {
        s.theme = theme
      })
    },
    pushToast(toast) {
      set((s) => {
        s.toasts.push(toast)
      })
    },
    dismissToast(id) {
      set((s) => {
        s.toasts = s.toasts.filter((t) => t.id !== id)
      })
    },
  })),
)

// ── selectors ──

export function selectActiveSidebarTab(s: UiState): SidebarTab {
  return s.activeSidebarTab
}

export function selectProjectListOpen(s: UiState): boolean {
  return s.projectListOpen
}

export function selectTheme(s: UiState): ThemeMode {
  return s.theme
}
