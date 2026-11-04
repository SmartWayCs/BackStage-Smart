import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/constants'
import { formatDate, isOverdue } from '@/lib/utils'
import { ProgressBar, Tags } from './ProjectCard'
import type { Profile, ProjectRow } from '@/types/database.types'

export function ProjectTable({ projects, profiles }: { projects: ProjectRow[]; profiles: Map<string, Profile> }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
          <tr>{['Projeto', 'Status', 'Responsável', 'Prioridade', 'Prazo', 'Progresso', 'Tags'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
              <td className="p-3 font-medium"><Link className="hover:underline" to={`/projetos/${p.id}`}>{p.nome}</Link></td>
              <td className="p-3"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />{STATUS_LABEL[p.status]}</span></td>
              <td className="p-3">{p.responsavel_id ? profiles.get(p.responsavel_id)?.nome ?? '—' : '—'}</td>
              <td className="p-3"><PriorityBadge value={p.prioridade} /></td>
              <td className={clsx('p-3', isOverdue(p.prazo, p.status === 'concluido') && 'font-medium text-red-600')}>{formatDate(p.prazo)}</td>
              <td className="w-40 p-3"><ProgressBar value={p.progresso} /></td>
              <td className="p-3"><Tags tags={p.tags} /></td>
            </tr>
          ))}
          {!projects.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum projeto encontrado.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
