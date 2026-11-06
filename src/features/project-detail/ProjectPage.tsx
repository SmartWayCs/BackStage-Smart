import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarRange, ClipboardList, History, KanbanSquare, Lightbulb, MessageSquare, NotebookText, Paperclip, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useProject } from '@/features/projects/api'
import { ProjectSummary } from './ProjectSummary'
import { EditProjectDialog } from './EditProjectDialog'
import { StageBoard } from './StageBoard'
import { PlanningTab } from './PlanningTab'
import { ScheduleTab } from './ScheduleTab'
import { ProjectNotesTab } from '@/features/notes/ProjectNotesTab'
import { Ideas } from './Ideas'
import { Comments } from './Comments'
import { Attachments } from './Attachments'
import { Timeline } from './Timeline'
import { useAttachments, useComments, useIdeas, useStages } from './api'
import type { ProjectRow } from '@/types/database.types'

type TabId = 'etapas' | 'planejamento' | 'cronograma' | 'notas' | 'ideias' | 'comentarios' | 'anexos' | 'historico'

/** Cada parte do projeto fica na sua aba, para a tela não ficar uma pilha de blocos. */
function ProjectBody({ project }: { project: ProjectRow }) {
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const stages = useStages(project.id)
  const ideas = useIdeas(project.id)
  const comments = useComments(project.id)
  const attachments = useAttachments(project.id)

  const tabs: { id: TabId; label: string; icon: LucideIcon; n?: number }[] = [
    { id: 'etapas', label: 'Etapas', icon: KanbanSquare, n: stages.data?.length },
    { id: 'planejamento', label: 'Planejamento', icon: ClipboardList },
    { id: 'cronograma', label: 'Cronograma', icon: CalendarRange },
    { id: 'notas', label: 'Notas', icon: NotebookText },
    { id: 'ideias', label: 'Ideias', icon: Lightbulb, n: ideas.data?.length },
    { id: 'comentarios', label: 'Comentários', icon: MessageSquare, n: comments.data?.length },
    { id: 'anexos', label: 'Anexos', icon: Paperclip, n: attachments.data?.filter((a) => !a.stage_id).length },
    { id: 'historico', label: 'Histórico', icon: History },
  ]
  const current = (tabs.find((t) => t.id === params.get('aba'))?.id ?? 'etapas') as TabId

  return (
    <>
      <ProjectSummary project={project} onEdit={() => setEditing(true)} />

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Partes do projeto">
        {tabs.map((t) => {
          const active = t.id === current
          return (
            <button key={t.id} role="tab" aria-selected={active}
              onClick={() => setParams(t.id === 'etapas' ? {} : { aba: t.id }, { replace: true })}
              className={clsx('-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200',
                active ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100')}>
              <t.icon size={16} />{t.label}
              {t.n !== undefined && (
                <span className={clsx('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-brand/10' : 'bg-slate-100 dark:bg-slate-800')}>{t.n}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div key={current} role="tabpanel" className="animate-fade-up">
        {current === 'etapas' && <StageBoard projectId={project.id} />}
        {current === 'planejamento' && <PlanningTab project={project} />}
        {current === 'cronograma' && <ScheduleTab project={project} />}
        {current === 'notas' && <ProjectNotesTab projectId={project.id} />}
        {current === 'ideias' && <div className="max-w-4xl"><Ideas projectId={project.id} /></div>}
        {current === 'comentarios' && <div className="max-w-4xl"><Comments projectId={project.id} /></div>}
        {current === 'anexos' && <div className="max-w-4xl"><Attachments projectId={project.id} /></div>}
        {current === 'historico' && <div className="max-w-4xl"><Timeline projectId={project.id} /></div>}
      </div>

      {editing && <EditProjectDialog project={project} onClose={() => setEditing(false)} />}
    </>
  )
}

export function ProjectPage() {
  const { id } = useParams()
  const { data: project, isLoading, error } = useProject(id)

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:-translate-x-0.5 hover:text-slate-900 dark:hover:text-slate-100"><ArrowLeft size={14} />Todos os projetos</Link>
      {isLoading && <div className="skeleton h-56" />}
      {error && <p className="text-sm text-red-600">Erro ao carregar: {(error as Error).message}</p>}
      {!isLoading && !error && !project && <p className="text-sm">Projeto não encontrado.</p>}
      {project && <ProjectBody project={project} />}
    </div>
  )
}
