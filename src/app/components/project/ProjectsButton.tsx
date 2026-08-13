/**
 * Projects button (M05).
 *
 * Opens the projects list sheet — the React equivalent of the legacy
 * `btn-projects` / `openProjectsModal` (legacy/index.html:3201). On open,
 * the service refreshes the typed summary list from the legacy IDB and
 * flips the UI store flag that drives the `ProjectsSheet`.
 */
import { Folder } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { projectService } from '@/app/services/project-service'
import { useTranslation } from 'react-i18next'

export function ProjectsButton() {
  const { t } = useTranslation('editor')
  const onOpen = () => {
    void projectService.openProjects()
  }
  return (
    <Button variant="outline" size="sm" onClick={onOpen} aria-label={t('header.openProjects')}>
      <Folder className="h-4 w-4 sm:mr-1" />
      <span className="hidden sm:inline">{t('header.projects')}</span>
    </Button>
  )
}
