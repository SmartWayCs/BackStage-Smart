import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CalendarDays, CheckCircle2, ChevronDown, Clock, FileText, Pencil, Wrench } from 'lucide-react'
import clsx from 'clsx'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { PRIORITY_COLOR } from '@/lib/constants'
import { formatDate, formatHours, isOverdue, isProjectDone } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useUpdateProject } from '@/features/projects/api'
import { ProgressRing, Tags, ownersOf } from '@/features/projects/ProjectCard'
import type { ProjectRow } from '@/types/database.types'

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

/** Parte 1 da página: o resumo do projeto e a situação atual. Editar fica numa janela à parte. */
export function ProjectSummary({ project, onEdit }: { project: ProjectRow; onEdit: () => void }) {
  const { canEdit } = usePermissions()
  const profiles = useProfileMap()
  const update = useUpdateProject()
  const done = isProjectDone(project)
  const maint = project.modo === 'manutencao'
  const overdue = !maint && isOverdue(project.prazo, done)
  const accent = PRIORITY_COLOR[project.prioridade]

  const [editing, setEditing] = useState(false)
  const [showDesc, setShowDesc] = useState(false) // a descrição é longa: fica recolhida até pedirem
  const [text, setText] = useState(project.situacao_atual ?? '')
  useEffect(() => { if (!editing) setText(project.situacao_atual ?? '') }, [project.situacao_atual, editing])
  const dirty = text.trim() !== (project.situacao_atual ?? '')

  return (
    <header className="card relative overflow-hidden p-5 sm:p-6">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}33)` }} />

      <div className="flex flex-wrap items-start gap-5">
        {maint ? (
          <div className="flex size-[88px] flex-col items-center justify-center rounded-full bg-slate-100 text-center dark:bg-slate-800">
            <span className="text-3xl font-bold tabular-nums leading-none">{project.etapas_total - project.etapas_feitas}</span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">em aberto</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ProgressRing value={project.progresso} size={88} color={done ? '#059669' : 'var(--series-1)'} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {project.etapas_total === 0 ? 'sem etapas' : `${project.etapas_feitas}/${project.etapas_total} etapas`}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Projeto</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{project.nome}</h1>
            <PriorityBadge value={project.prioridade} />
            {maint && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><Wrench size={12} />Em manutenção</span>}
            {done && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 size={12} />Concluído</span>}
            {overdue && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"><Clock size={12} />Atrasado</span>}
          </div>
          {project.descricao && (
            <div>
              <button className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" aria-expanded={showDesc} onClick={() => setShowDesc((v) => !v)}>
                <ChevronDown size={14} className={clsx('transition-transform duration-200', showDesc && 'rotate-180')} />{showDesc ? 'Ocultar descrição' : 'Mostrar descrição'}
              </button>
              {showDesc && <p className="mt-2 max-w-4xl animate-fade-up whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{project.descricao}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/relatorio?projeto=${project.id}`} className="btn-ghost rounded-xl border border-slate-200 dark:border-slate-700"><FileText size={14} />Relatório</Link>
          {canEdit && <button className="btn-ghost rounded-xl border border-slate-200 dark:border-slate-700" onClick={onEdit}><Pencil size={14} />Editar projeto</button>}
        </div>
      </div>

      <dl className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 dark:border-slate-800">
        <Meta label="Responsáveis"><AvatarStack people={ownersOf(project, profiles)} /></Meta>
        <Meta label="Início"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />{formatDate(project.data_inicio)}</span></Meta>
        <Meta label="Prazo">
          <span className={clsx('inline-flex items-center gap-1.5', overdue && 'text-red-600 dark:text-red-400')}><CalendarDays size={14} className={overdue ? '' : 'text-slate-400'} />{formatDate(project.prazo)}</span>
        </Meta>
        <Meta label="Previsão">
          <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{project.horas_previstas === null ? <span className="font-normal text-slate-400">Não definida</span> : formatHours(project.horas_previstas)}</span>
        </Meta>
        <Meta label="Realizado"><span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{formatHours(project.horas_realizadas)}</span></Meta>
        <Meta label="Tags">{project.tags.length ? <Tags tags={project.tags} /> : <span className="font-normal text-slate-400">Sem tags</span>}</Meta>
      </dl>

      <section aria-label="Situação atual" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300"><Activity size={14} />Situação atual · o que está acontecendo agora</p>
          {canEdit && !editing && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(true)}><Pencil size={12} />Atualizar</button>}
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea className="input" rows={2} maxLength={280} autoFocus value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Ex.: aguardando liberação do fornecedor; testando integração…" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{text.length}/280</span>
              <div className="flex gap-2">
                <button className="btn-ghost px-3 py-1.5" onClick={() => setEditing(false)}>Cancelar</button>
                <button className="btn-primary px-3 py-1.5" disabled={!dirty || update.isPending}
                  onClick={() => update.mutate({ id: project.id, patch: { situacao_atual: text.trim() || null } }, { onSuccess: () => setEditing(false) })}>Salvar</button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm">{project.situacao_atual || <span className="text-slate-500">Nenhuma atualização ainda.</span>}</p>
        )}
      </section>
    </header>
  )
}
