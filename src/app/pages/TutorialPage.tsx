import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoCard, InfoPageLayout, InfoSection } from './InfoPageLayout'

interface TutorialCard {
  readonly title: string
  readonly paragraphs?: readonly string[]
  readonly items?: readonly string[]
}

interface TutorialSection {
  readonly id: string
  readonly title: string
  readonly intro?: string
  readonly columns: 1 | 2 | 3
  readonly cards: readonly TutorialCard[]
}

const gridClass = {
  1: 'grid gap-5',
  2: 'grid gap-5 md:grid-cols-2',
  3: 'grid gap-5 md:grid-cols-3',
} as const

export function TutorialPage(): ReactElement {
  const { t } = useTranslation('tutorial')
  const sections = t('sections', { returnObjects: true }) as unknown as readonly TutorialSection[]

  return (
    <InfoPageLayout
      eyebrow={t('eyebrow')}
      title={t('title')}
      description={t('description')}
      aside={
        <nav className="rounded-2xl border border-black/10 bg-white p-3" aria-label={t('navLabel')}>
          <p className="px-3 pb-2 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
            {t('onThisPage')}
          </p>
          {sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-black/65 transition hover:bg-[#f1eadb] hover:text-black"
            >
              <span className="font-mono text-[10px] text-black/35">
                {String(index + 1).padStart(2, '0')}
              </span>
              {section.title}
            </a>
          ))}
        </nav>
      }
    >
      {sections.map((section, index) => (
        <InfoSection
          key={section.id}
          number={String(index + 1).padStart(2, '0')}
          id={section.id}
          title={section.title}
          {...(section.intro ? { intro: section.intro } : {})}
        >
          <div className={gridClass[section.columns]}>
            {section.cards.map((card) => (
              <InfoCard key={card.title} title={card.title}>
                {card.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {card.items && (
                  <ul>
                    {card.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </InfoCard>
            ))}
          </div>
        </InfoSection>
      ))}
    </InfoPageLayout>
  )
}
