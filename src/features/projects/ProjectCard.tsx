import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, CheckCircle2, Wrench } from 'lucide-react'
import clsx from 'clsx'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { PRIORITY_COLOR } from '@/lib/constants'
import { formatDate, isOverdue, isProjectDone } from '@/lib/utils'
import type { StageCount } from './api'
import type { Profile, ProjectRow } from '@/types/database.types'

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" title={`${value}% concluído`}>
      <div className="flex-1"><AnimatedBar value={value} /></div>
      <span className="w-8 text-right text-xs tabular-nums text-slate-500">{value}%</span>
    </div>
  )
}

export function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:bg-brand/10 hover:text-brand dark:bg-slate-800 dark:text-slate-300">{t}</span>
      ))}
    </div>
  )
}

export function ownersOf(p: ProjectRow, profiles: Map<string, Profile>) {
  return p.responsaveis_ids.map((id) => profiles.get(id)).filter((x): x is Profile => Boolean(x))
}

/** Anel de progresso circular que se preenche ao aparecer. */
export function ProgressRing({ value, size = 64, color = 'var(--series-1)' }: { value: number; size?: number; color?: string }) {
  const [shown, setShown] = useState(0)
  useEffect(() => { const id = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(id) }, [value])
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% concluído`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-700" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={color} strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">{value}%</span>
    </div>
  )
}

/** Card do projeto na tela inicial: resumo do projeto e e de quantas etapas há em cada status. */
export function ProjectGridCard({ project, owners, stages }: { project: ProjectRow; owners: Profile[]; stages: StageCount[] }) {
  const navigate = useNavigate()
  const done = isProjectDone(project)
  const maint = project.modo === 'manutencao'
  const overdue = !maint && isOverdue(project.prazo, done)
  const shown = stages.slice(0, 4)
  const extra = stages.length - shown.length
  const accent = PRIORITY_COLOR[project.prioridade]

  return (
    <article onClick={() => navigate(`/projetos/${project.id}`)} role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/projetos/${project.id}`) }}
      className="card card-hover group relative flex h-full cursor-pointer flex-col gap-4 overflow-hidden p-5">
      {/* faixa no topo na cor da prioridade */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}33)` }} />

      <div className="flex items-center justify-between gap-2">
        <PriorityBadge value={project.prioridade} />
        {maint
          ? <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><Wrench size={12} />Em manutenção</span>
          : done
          ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 size={12} />Concluído</span>
          : project.prazo && (
            <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
              overdue ? 'bg-red-50 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
              <CalendarDays size={12} />{overdue ? 'Venceu ' : ''}{formatDate(project.prazo)}
            </span>
          )}
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-lg font-semibold leading-snug tracking-tight">{project.nome}</h3>
          {project.descricao
            ? <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{project.descricao}</p>
            : <p className="text-sm italic text-slate-400">Sem descrição</p>}
        </div>
        {maint ? (
          <div className="flex shrink-0 flex-col items-center rounded-xl bg-slate-100 px-3 py-2 text-center dark:bg-slate-800">
            <span className="text-2xl font-bold tabular-nums">{project.etapas_total - project.etapas_feitas}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">em aberto</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ProgressRing value={project.progresso} color={done ? '#059669' : 'var(--series-1)'} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {project.etapas_total === 0 ? 'sem etapas' : `${project.etapas_feitas}/${project.etapas_total}`}
            </span>
          </div>
        )}
      </div>

      {shown.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Etapas por status">
          {shown.map((s) => (
            <li key={s.nome} className={clsx('rounded-full px-2.5 py-0.5 text-xs',
              s.is_done ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
              {s.nome} <strong className="font-semibold tabular-nums">{s.count}</strong>
            </li>
          ))}
          {extra > 0 && <li className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">+{extra}</li>}
        </ul>
      )}

      <div className="mt-auto space-y-3">
        <Tags tags={project.tags} />
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
          <span className="flex min-w-0 items-center"><AvatarStack people={owners} /></span>
          <ArrowUpRight size={16} className="shrink-0 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
      </div>
    </article>
  )
}
