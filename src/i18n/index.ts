import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'
import { coreResources } from './core-resources'

export const SUPPORTED_LOCALES = ['en', 'vi'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const LOCALE_STORAGE_KEY = 'void-motion.locale'

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './locales/*/{info,tutorial}.json',
)

export const i18nReady = i18n
  .use(LanguageDetector)
  .use(
    resourcesToBackend(async (language: string, namespace: string) => {
      const locale = SUPPORTED_LOCALES.includes(language as SupportedLocale) ? language : 'en'
      const loader = localeModules[`./locales/${locale}/${namespace}.json`]
      if (!loader) throw new Error(`Missing i18n resource: ${locale}/${namespace}`)
      return (await loader()).default
    }),
  )
  .use(initReactI18next)
  .init({
    resources: coreResources,
    partialBundledLanguages: true,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common', 'editor', 'projects', 'layers', 'animation', 'export', 'tools'],
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: true },
    returnNull: false,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (languages, namespace, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing ${languages.join(',')}/${namespace}:${key}`)
      }
    },
  })

function syncDocumentLanguage(): void {
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0] ?? 'en'
  document.documentElement.lang = locale
  document.documentElement.dir = i18n.dir(locale)
}

i18n.on('initialized', syncDocumentLanguage)
i18n.on('languageChanged', syncDocumentLanguage)
void i18nReady.then(syncDocumentLanguage)

export function resolvedLocale(): SupportedLocale {
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0]
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale) ? (locale as SupportedLocale) : 'en'
}

export default i18n
