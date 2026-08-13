import { afterEach, describe, expect, it } from 'vitest'
import i18n, { i18nReady, LOCALE_STORAGE_KEY } from '@/i18n'
import { formatSaveTime, formatSizeBytes, formatTimeAgo } from '@/app/services/time-ago'

afterEach(async () => {
  localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage('en')
})

describe('internationalization runtime', () => {
  it('changes language, persists the choice, and syncs document metadata', async () => {
    await i18nReady
    await i18n.changeLanguage('vi')

    expect(i18n.t('nav.tutorial', { ns: 'common' })).toBe('Hướng dẫn')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('vi')
    expect(document.documentElement.lang).toBe('vi')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('falls back to English for an unsupported locale', async () => {
    await i18n.changeLanguage('fr')
    expect(i18n.resolvedLanguage).toBe('en')
    expect(i18n.t('nav.about', { ns: 'common' })).toBe('About')
  })

  it('loads route namespaces and exposes the Vietnamese guide', async () => {
    await i18n.changeLanguage('vi')
    await i18n.loadNamespaces(['info', 'tutorial'])
    expect(i18n.t('title', { ns: 'tutorial' })).toBe('Vẽ một ý tưởng. Xem nó chuyển động.')
    expect(i18n.t('privacy.eyebrow', { ns: 'info' })).toBe('Quyền riêng tư')
  })

  it('formats relative time, sizes, and clock values for Vietnamese', () => {
    const now = new Date('2026-01-10T12:00:00Z').getTime()
    expect(formatTimeAgo(now, '2026-01-10T11:30:00Z', 'vi')).toBe('30 phút trước')
    expect(formatSizeBytes(2048, 'vi')).toBe('2,0 KB')
    expect(formatSaveTime('2026-01-10T09:30:05Z', 'vi')).not.toBe('')
  })
})
