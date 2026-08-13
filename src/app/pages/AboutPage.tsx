import type { ReactElement } from 'react'
import { InfoCard, InfoPageLayout, InfoSection } from './InfoPageLayout'
import { useTranslation } from 'react-i18next'
import { EXTERNAL_LINKS } from '@/app/config/external-links'

export function AboutPage(): ReactElement {
  const { t } = useTranslation('info')
  return (
    <InfoPageLayout
      eyebrow={t('about.eyebrow')}
      title={t('about.title')}
      description={t('about.description')}
    >
      <InfoSection number="01" id="purpose" title={t('about.purpose')}>
        <InfoCard title={t('about.localTitle')}>
          <p>{t('about.localBody')}</p>
        </InfoCard>
      </InfoSection>
      <InfoSection number="02" id="migration" title={t('about.migration')}>
        <div className="grid gap-5 md:grid-cols-2">
          <InfoCard title={t('about.reactTitle')}>
            <p>{t('about.reactBody')}</p>
          </InfoCard>
          <InfoCard title={t('about.behaviorTitle')}>
            <p>{t('about.behaviorBody')}</p>
          </InfoCard>
        </div>
      </InfoSection>
      <InfoSection number="03" id="open-source" title={t('about.openSource')}>
        <InfoCard title={t('about.buildTitle')}>
          <p>{t('about.buildBody')}</p>
          <p>
            <a
              className="font-semibold text-black underline underline-offset-4"
              href={EXTERNAL_LINKS.repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('about.repository')}
            </a>
          </p>
        </InfoCard>
      </InfoSection>
    </InfoPageLayout>
  )
}
