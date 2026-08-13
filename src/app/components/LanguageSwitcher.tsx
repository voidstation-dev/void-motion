import type { ReactElement } from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { resolvedLocale, type SupportedLocale } from '@/i18n'

export function LanguageSwitcher(): ReactElement {
  const { t, i18n } = useTranslation('common')
  const locale = resolvedLocale()
  const change = (value: string): void => {
    void i18n.changeLanguage(value as SupportedLocale)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label={t('language')}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={change}>
          <DropdownMenuRadioItem value="en">{t('languages.en')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="vi">{t('languages.vi')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
