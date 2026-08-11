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

export function ProjectsButton() {
  const onOpen = () => {
    void projectService.openProjects()
  }
  return (
    <Button variant="outline" size="sm" onClick={onOpen} aria-label="Open projects list">
      <Folder className="mr-1 h-4 w-4" />
      Projects
    </Button>
  )
}
