import { useState } from 'react'
import { AlertTriangle, CalendarDays, Clock, ImagePlus, Lock, Pencil } from 'lucide-react'
import clsx from 'clsx'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { StatusTag } from '@/components/ui/StatusTag'
import { RISCO_CLASS, RISCO_LABEL } from '@/lib/constants'
import { formatDate, formatHours } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { BarList } from '@/features/dashboard/Charts'
import { useStageOwners } from '@/features/projects/api'
import { useAttachments, useStages } from './api'
import { Gallery } from './Gallery'
import { StageDialog } from './StageDialog'
import type { ProjectRow } from '@/types/database.types'

function HoursTile({ label, value, children, tone }: { label: string; value: string; children?: React.ReactNode; tone?: 'warn' }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={clsx('mt-1 text-3xl font-bold tabular-nums tracking-tight', tone === 'warn' && 'text-red-600 dark:text-red-400')}>{value}</p>
      <div className="mt-1 text-xs text-slate-500">{children}</div>
    </div>
  )
}

/** Visão de leitura: tudo o que foi explicado sobre cada etapa, em ordem, com horas, datas e imagens. */
export function PlanningTab({ project }: { project: ProjectRow }) {
  const { canEdit } = usePermissions()
  const profiles = useProfileMap()
  const { owners } = useStageOwners()
  const stages = useStages(project.id).data ?? []
  const attachments = useAttachments(project.id).data ?? []
  const [openId, setOpenId] = useState<string | null>(null)

  const previsto = project.horas_previstas
  const etapas = project.horas_etapas
  const realizado = project.horas_realizadas
  const base = previsto ?? (etapas || null)
  const over = previsto !== null && etapas > previsto
  const stageHours = stages.filter((s) => s.horas_previstas !== null).map((s) => ({ label: s.nome, value: s.horas_previstas as number }))
  const open = stages.find((s) => s.id === openId)

  return (
    <div className="space-y-6">
      <section aria-label="Horas do projeto" className="grid gap-3 md:grid-cols-3">
        <HoursTile label="Previsão do projeto" value={previsto === null ? 'Não definida' : formatHours(previsto)}>
          {previsto === null ? (canEdit ? 'Defina em “Editar projeto”.' : 'Ainda não informada.') : 'Total estimado para o projeto todo'}
        </HoursTile>
        <HoursTile label="Soma das etapas" value={formatHours(etapas)} tone={over ? 'warn' : undefined}>
          {over
            ? <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><AlertTriangle size={12} />Passa {formatHours(etapas - (previsto ?? 0))} da previsão do projeto</span>
            : previsto !== null ? `Restam ${formatHours(previsto - etapas)} para distribuir` : 'Horas previstas nas etapas'}
        </HoursTile>
        <HoursTile label="Horas realizadas" value={formatHours(realizado)}>
          {base ? (
            <div className="space-y-1">
              <AnimatedBar value={realizado} max={base} />
              <span>{Math.round((realizado / base) * 100)}% de {formatHours(base)}</span>
            </div>
          ) : 'Soma das horas lançadas nas etapas'}
        </HoursTile>
      </section>

      {stageHours.length > 0 && (
        <section className="card p-5" aria-label="Horas previstas por etapa">
          <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-wider text-slate-500">Previsão de horas por etapa</h2>
          <BarList data={stageHours} unit="h" />
        </section>
      )}

      <section aria-label="Etapas do projeto" className="space-y-4">
        {!stages.length && <p className="text-sm text-slate-500">Este projeto ainda não tem etapas.</p>}
        {stages.map((s, i) => {
          const images = attachments.filter((a) => a.stage_id === s.id)
          const ownerNames = (owners.get(s.id) ?? []).map((id) => profiles.get(id)?.nome ?? '?').join(', ')
          return (
            <article key={s.id} className="card animate-fade-up p-5" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <header className="flex flex-wrap items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-accent font-bold text-white shadow-md shadow-brand/30">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{s.nome}</h3>
                    <StatusTag value={s.status} />
                    {s.bloqueada && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300"><Lock size={11} />Bloqueada</span>}
                    {s.risco && s.status !== 'concluido' && <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', RISCO_CLASS[s.risco])}>{RISCO_LABEL[s.risco]}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />Previsão: <strong>{formatHours(s.horas_previstas)}</strong></span>
                    <span>Realizado: <strong>{formatHours(s.horas_realizadas)}</strong></span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />{formatDate(s.data_inicio)} → {formatDate(s.prazo)}</span>
                    <span>Responsáveis: <strong>{ownerNames || '—'}</strong></span>
                  </div>
                </div>
                {canEdit && <button className="btn-ghost rounded-xl border border-slate-200 dark:border-slate-700" onClick={() => setOpenId(s.id)}><Pencil size={14} />Editar etapa</button>}
              </header>

              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                {s.bloqueada && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><strong>Bloqueada:</strong> {s.bloqueio_motivo || 'sem motivo informado.'}</p>}
                {s.descricao
                  ? <p className="max-w-4xl whitespace-pre-wrap text-sm leading-relaxed">{s.descricao}</p>
                  : canEdit
                    ? <button className="w-full rounded-lg border border-dashed border-slate-300 p-3 text-left text-sm text-slate-500 transition hover:border-brand hover:text-brand dark:border-slate-700" onClick={() => setOpenId(s.id)}>
                        Sem explicação ainda. Clique para descrever o que será feito nesta etapa.</button>
                    : <p className="text-sm text-slate-400">Sem explicação cadastrada.</p>}

                {images.length > 0 && <Gallery items={images} canEdit={false} onDelete={() => {}} />}
                {!images.length && canEdit && (
                  <button className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand" onClick={() => setOpenId(s.id)}><ImagePlus size={14} />Adicionar imagens que expliquem a etapa</button>
                )}
              </div>
            </article>
          )
        })}
      </section>

      {open && <StageDialog key={open.id} stage={open} projectId={project.id} onClose={() => setOpenId(null)} />}
    </div>
  )
}
