import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import clsx from 'clsx'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Profile, ProjectRow } from '@/types/database.types'

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" title={`${value}% concluído`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
        <div className="h-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-slate-500">{value}%</span>
    </div>
  )
}

export function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t}</span>
      ))}
    </div>
  )
}

export function ProjectCardBody({ project, owner }: { project: ProjectRow; owner?: Profile }) {
  const overdue = isOverdue(project.prazo, project.status === 'concluido')
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{project.nome}</h3>
        <PriorityBadge value={project.prioridade} />
      </div>
      <ProgressBar value={project.progresso} />
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex min-w-0 items-center gap-1">
          {owner ? <><Avatar nome={owner.nome} src={owner.avatar_url} size={20} /><span className="truncate">{owner.nome}</span></> : 'Sem responsável'}
        </span>
        {project.prazo && (
          <span className={clsx('flex shrink-0 items-center gap-1', overdue && 'font-medium text-red-600')}>
            <CalendarDays size={12} />{formatDate(project.prazo)}
          </span>
        )}
      </div>
      <Tags tags={project.tags} />
    </div>
  )
}

export function ProjectCard({ project, owner }: { project: ProjectRow; owner?: Profile }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate(`/projetos/${project.id}`)} className="card cursor-pointer p-3 hover:border-brand">
      <ProjectCardBody project={project} owner={owner} />
    </div>
  )
}
