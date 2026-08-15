import { Home } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { projectService } from '@/app/services/project-service'
import { useTranslation } from 'react-i18next'

export function ProjectsButton() {
  const { t } = useTranslation('editor')
  const onOpen = () => {
    void projectService.openProjects()
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpen}
      aria-label={t('header.openProjects')}
      className="h-8 gap-1.5 rounded-[8px] border border-black/10 bg-white px-2.5 text-xs font-semibold text-foreground shadow-sm hover:bg-black/5"
    >
      <Home className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{t('header.projects', 'Projects')}</span>
    </Button>
  )
}

