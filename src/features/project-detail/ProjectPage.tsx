import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProject } from '@/features/projects/api'
import { ProjectHeader } from './ProjectHeader'
import { SituacaoAtual } from './SituacaoAtual'
import { TaskBoard } from './TaskBoard'
import { Ideas } from './Ideas'
import { Comments } from './Comments'
import { Attachments } from './Attachments'
import { Timeline } from './Timeline'

export function ProjectPage() {
  const { id } = useParams()
  const { data: project, isLoading, error } = useProject(id)

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><ArrowLeft size={14} />Projetos</Link>
      {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      {error && <p className="text-sm text-red-600">Erro ao carregar: {(error as Error).message}</p>}
      {!isLoading && !error && !project && <p className="text-sm">Projeto não encontrado.</p>}
      {project && (
        <>
          <ProjectHeader project={project} />
          <SituacaoAtual project={project} />
          <TaskBoard projectId={project.id} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4"><Ideas projectId={project.id} /><Attachments projectId={project.id} /></div>
            <div className="space-y-4"><Comments projectId={project.id} /><Timeline projectId={project.id} /></div>
          </div>
        </>
      )}
    </div>
  )
}
