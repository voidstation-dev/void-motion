import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher'
import i18n, { LOCALE_STORAGE_KEY } from '@/i18n'

afterEach(async () => {
  cleanup()
  localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage('en')
})

describe('LanguageSwitcher', () => {
  it('reflects a live Vietnamese switch and persisted choice', async () => {
    await i18n.changeLanguage('en')
    render(<LanguageSwitcher />)

    await act(async () => i18n.changeLanguage('vi'))

    expect(document.documentElement.lang).toBe('vi')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('vi')
    expect(screen.getByRole('button', { name: 'Ngôn ngữ' })).toBeTruthy()
  })
})
