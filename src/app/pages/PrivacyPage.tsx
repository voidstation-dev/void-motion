import type { ReactElement } from 'react'
import { InfoCard, InfoPageLayout, InfoSection } from './InfoPageLayout'
import { useTranslation } from 'react-i18next'

export function PrivacyPage(): ReactElement {
  const { t } = useTranslation('info')
  return (
    <InfoPageLayout
      eyebrow={t('privacy.eyebrow')}
      title={t('privacy.title')}
      description={t('privacy.description')}
    >
      <InfoSection number="01" id="storage" title={t('privacy.storage')}>
        <InfoCard title={t('privacy.storedTitle')}>
          <p>{t('privacy.storedBody1')}</p>
          <p>{t('privacy.storedBody2')}</p>
        </InfoCard>
      </InfoSection>
      <InfoSection number="02" id="network" title={t('privacy.network')}>
        <InfoCard title={t('privacy.leavesTitle')}>
          <p>{t('privacy.leavesBody1')}</p>
          <p>{t('privacy.leavesBody2')}</p>
        </InfoCard>
      </InfoSection>
      <InfoSection number="03" id="control" title={t('privacy.controls')}>
        <div className="grid gap-5 md:grid-cols-2">
          <InfoCard title={t('privacy.deleteTitle')}>
            <p>{t('privacy.deleteBody')}</p>
          </InfoCard>
          <InfoCard title={t('privacy.clearTitle')}>
            <p>{t('privacy.clearBody')}</p>
          </InfoCard>
        </div>
      </InfoSection>
      <InfoSection number="04" id="security" title={t('privacy.security')}>
        <InfoCard title={t('privacy.profileTitle')}>
          <p>{t('privacy.profileBody')}</p>
        </InfoCard>
      </InfoSection>
    </InfoPageLayout>
  )
}
