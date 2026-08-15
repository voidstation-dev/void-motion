import type { ReactElement, ReactNode } from 'react'
import { ArrowLeft, Code2, Pencil, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher'
import { usePageMetadata } from '@/app/hooks/usePageMetadata'
import { EXTERNAL_LINKS } from '@/app/config/external-links'

interface InfoPageLayoutProps {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly children: ReactNode
  readonly aside?: ReactNode
}

export function InfoPageLayout({
  eyebrow,
  title,
  description,
  children,
  aside,
}: InfoPageLayoutProps): ReactElement {
  const { t } = useTranslation('common')
  usePageMetadata(`${t('brand')} — ${title}`, description)
  return (
    <div className="h-full overflow-y-auto bg-[#f4f4f1] text-[#171717]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f4f1]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-10">
          <a
            href="/"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 sm:px-3 text-sm font-medium transition hover:border-black/30"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('nav.backToEditor')}</span>
          </a>
          <a href="/" className="ml-0.5 sm:ml-1 flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-white">
              <Pencil className="h-4 w-4" />
            </span>
            <span className="font-hand text-xl sm:text-2xl font-bold whitespace-nowrap">Void Motion</span>
          </a>
          <nav
            className="ml-auto flex items-center gap-1 sm:gap-2"
            aria-label={t('nav.informationPages')}
          >
            {window.location.pathname !== '/tutorial' && (
              <a className="whitespace-nowrap rounded-lg px-2 sm:px-3 py-2 text-sm hover:bg-black/5" href="/tutorial">
                {t('nav.tutorial')}
              </a>
            )}
            <a
              className="hidden rounded-lg px-3 py-2 text-sm hover:bg-black/5 sm:block"
              href="/about"
            >
              {t('nav.about')}
            </a>
            <a
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm hover:bg-black/5 md:flex"
              href="/privacy"
            >
              <ShieldCheck className="h-4 w-4" /> {t('nav.privacy')}
            </a>
            <a
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 sm:px-3 text-sm hover:border-black/30"
              href={EXTERNAL_LINKS.repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Code2 className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{t('nav.source')}</span>
            </a>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-10">
        <section className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#d09b35] px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full border-[38px] border-white/20" />
          <div className="absolute bottom-7 right-10 hidden h-20 w-48 rotate-[-5deg] rounded-[50%] border-b-4 border-black/25 lg:block" />
          <div className="relative max-w-3xl">
            <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-black/60">
              {eyebrow}
            </p>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-black/70 sm:text-lg">
              {description}
            </p>
          </div>
        </section>

        <div className={`mt-8 grid gap-8 ${aside ? 'lg:grid-cols-[250px_minmax(0,1fr)]' : ''}`}>
          {aside && <aside className="lg:sticky lg:top-24 lg:self-start">{aside}</aside>}
          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}

export function InfoSection({
  number,
  id,
  title,
  intro,
  children,
}: {
  readonly number: string
  readonly id: string
  readonly title: string
  readonly intro?: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-black/10 py-10 first:border-t-0 first:pt-0 sm:py-14"
    >
      <div className="mb-8 flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171717] font-mono text-xs text-white">
          {number}
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{title}</h2>
          {intro && <p className="mt-2 max-w-3xl leading-7 text-black/60">{intro}</p>}
        </div>
      </div>
      <div className="ml-0 space-y-5 sm:ml-[52px]">{children}</div>
    </section>
  )
}

export function InfoCard({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}): ReactElement {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:p-6">
      <h3 className="text-lg font-semibold tracking-[-0.015em]">{title}</h3>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-black/65 [&_strong]:font-semibold [&_strong]:text-black/90 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  )
}
