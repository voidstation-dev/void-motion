import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from '@/app/regions/Header'
import { TutorialPage } from '@/app/pages/TutorialPage'
import { AboutPage } from '@/app/pages/AboutPage'
import { PrivacyPage } from '@/app/pages/PrivacyPage'
import { useProjectStore } from '@/app/store'
import { EXTERNAL_LINKS } from '@/app/config/external-links'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('React information pages', () => {
  it('renders the migrated tutorial without a user-facing legacy URL', () => {
    const { container } = render(<TutorialPage />)
    expect(screen.getByRole('heading', { name: 'Draw an idea. Watch it move.' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Generate and export' })).toBeTruthy()
    expect(container.querySelector('a[href*="legacy"]')).toBeNull()
  })

  it('renders the About and Privacy pages as React content', () => {
    const about = render(<AboutPage />)
    expect(
      screen.getByRole('heading', { name: 'Whiteboard motion, without the black box.' }),
    ).toBeTruthy()
    about.unmount()
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: 'Your project stays on your device.' })).toBeTruthy()
  })
})

describe('responsive editor header', () => {
  it('uses the React tutorial route and exposes compact panel controls', () => {
    useProjectStore.getState().clear()
    const openSettings = vi.fn()
    const openLayers = vi.fn()
    const { container } = render(
      <Header compact onOpenSettings={openSettings} onOpenLayers={openLayers} />,
    )
    expect(container.querySelector('a[href="/tutorial"]')).toBeTruthy()
    expect(container.querySelector('a[href*="legacy"]')).toBeNull()
    expect(container.querySelector(`a[href="${EXTERNAL_LINKS.repository}"]`)).toBeTruthy()
    expect(container.querySelector(`a[href="${EXTERNAL_LINKS.support}"]`)).toBeTruthy()
    screen.getByRole('button', { name: 'Open animation settings' }).click()
    screen.getByRole('button', { name: 'Open layers panel' }).click()
    expect(openSettings).toHaveBeenCalledOnce()
    expect(openLayers).toHaveBeenCalledOnce()
  })
})
