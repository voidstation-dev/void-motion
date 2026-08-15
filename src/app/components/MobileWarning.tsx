import { type ReactElement } from 'react'
import { useTranslation, Trans } from 'react-i18next'

export function MobileWarning(): ReactElement {
  const { t } = useTranslation('common')
  const brand = t('brand')

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md lg:hidden p-6 overflow-y-auto">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-2xl text-card-foreground">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">
          {t('mobileWarning.title', { brand })}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
          {t('mobileWarning.description')}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <Trans
            i18nKey="mobileWarning.linksText"
            t={t}
            components={{
              1: <a href="/docs" className="font-medium text-foreground underline decoration-muted-foreground/50 hover:decoration-foreground underline-offset-4 transition-colors" />,
              2: <a href="/about" className="font-medium text-foreground underline decoration-muted-foreground/50 hover:decoration-foreground underline-offset-4 transition-colors" />,
              3: <a href="/privacy" className="font-medium text-foreground underline decoration-muted-foreground/50 hover:decoration-foreground underline-offset-4 transition-colors" />
            }}
          />
        </p>
      </div>
    </div>
  )
}
