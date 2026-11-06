import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { formatDate, projectOverdue } from '@/lib/utils'
import { ProgressBar, Tags } from './ProjectCard'
import type { Profile, ProjectRow } from '@/types/database.types'

export function ProjectTable({ projects, profiles }: { projects: ProjectRow[]; profiles: Map<string, Profile> }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
          <tr>{['Projeto', 'Responsáveis', 'Prioridade', 'Prazo', 'Etapas', 'Progresso', 'Tags'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="row-hover border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="p-3 font-medium"><Link className="link-slide" to={`/projetos/${p.id}`}>{p.nome}</Link></td>
              <td className="p-3">{p.responsaveis_ids.length ? p.responsaveis_ids.map((id) => profiles.get(id)?.nome ?? '?').join(', ') : '—'}</td>
              <td className="p-3"><PriorityBadge value={p.prioridade} /></td>
              <td className={clsx('p-3', projectOverdue(p) && 'font-medium text-red-600')}>{formatDate(p.prazo)}</td>
              <td className="p-3 tabular-nums">{p.etapas_total ? `${p.etapas_feitas}/${p.etapas_total}` : '—'}</td>
              <td className="w-40 p-3">{p.modo === 'manutencao' ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">Em manutenção</span> : <ProgressBar value={p.progresso} />}</td>
              <td className="p-3"><Tags tags={p.tags} /></td>
            </tr>
          ))}
          {!projects.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum projeto encontrado.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
