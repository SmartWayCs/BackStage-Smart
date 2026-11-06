import { useMemo, useRef, useState, type FormEvent } from 'react'
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, GripVertical, ImageIcon, Layers, Lock, Plus } from 'lucide-react'
import clsx from 'clsx'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { StatusTag } from '@/components/ui/StatusTag'
import { ETAPA_STATUS_DOT, ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER, RISCO_CLASS, RISCO_LABEL } from '@/lib/constants'
import { formatDate, formatHours, positionBetween } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useStageOwners } from '@/features/projects/api'
import { useAttachments, useStageMutations, useStages } from './api'
import { StageDialog } from './StageDialog'
import type { EtapaStatus, Stage } from '@/types/database.types'

/** Envolve o card para poder arrastá-lo e reordenar as etapas. */
function SortableStage({ id, disabled, children }: { id: string; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} role="group" tabIndex={-1}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.55 : 1, zIndex: isDragging ? 20 : undefined, position: 'relative' }}
      className={clsx('h-full touch-manipulation', isDragging && 'drop-shadow-2xl')}>
      {children}
    </div>
  )
}

/** Cada etapa é um card (uma tarefa grande do projeto), com uma tag de status. */
export function StageBoard({ projectId }: { projectId: string }) {
  const { canEdit } = usePermissions()
  const stagesQ = useStages(projectId)
  const attachmentsQ = useAttachments(projectId)
  const profileMap = useProfileMap()
  const { owners: stageOwners } = useStageOwners()
  const { create, update } = useStageMutations(projectId)
  const [filter, setFilter] = useState<EtapaStatus | 'todas'>('todas')
  const [adding, setAdding] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<EtapaStatus>('planejamento')
  const [openId, setOpenId] = useState<string | null>(null)

  // sempre na ordem da posição (assim o card já muda de lugar na hora ao arrastar)
  const stages = useMemo(() => [...(stagesQ.data ?? [])].sort((a, b) => a.posicao - b.posicao), [stagesQ.data])
  const imageCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of attachmentsQ.data ?? []) if (a.stage_id) m.set(a.stage_id, (m.get(a.stage_id) ?? 0) + 1)
    return m
  }, [attachmentsQ.data])
  const countBy = (st: EtapaStatus) => stages.filter((s) => s.status === st).length
  const canDrag = canEdit && filter === 'todas'
  const justDragged = useRef(false) // o fim de um arrasto não deve abrir os detalhes
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const visible = filter === 'todas' ? stages : stages.filter((s) => s.status === filter)
  const open = stages.find((s) => s.id === openId)

  function onDragEnd({ active, over }: DragEndEvent) {
    justDragged.current = true
    setTimeout(() => { justDragged.current = false }, 200)
    if (!over || active.id === over.id) return
    const from = stages.findIndex((s) => s.id === active.id)
    const to = stages.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    const order = arrayMove(stages, from, to)
    update.mutate({ id: String(active.id), patch: { posicao: positionBetween(order[to - 1]?.posicao, order[to + 1]?.posicao) } })
  }

  function move(stage: Stage, dir: -1 | 1) {
    const i = stages.findIndex((s) => s.id === stage.id)
    const posicao = dir === -1
      ? positionBetween(stages[i - 2]?.posicao, stages[i - 1]!.posicao)
      : positionBetween(stages[i + 1]!.posicao, stages[i + 2]?.posicao)
    update.mutate({ id: stage.id, patch: { posicao } })
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const nome = (adding ?? '').trim()
    if (!nome) return
    const last = Math.max(0, ...stages.map((s) => s.posicao))
    create.mutate({ nome, posicao: last + 1000, status: newStatus }, { onSuccess: () => setAdding(null) })
  }

  return (
    <section className="space-y-4" aria-label="Etapas do projeto">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
          {([['todas', 'Todas', stages.length], ...ETAPA_STATUS_ORDER.map((s) => [s, ETAPA_STATUS_LABEL[s], countBy(s)] as const)] as const).map(([value, label, n]) => (
            <button key={value} onClick={() => setFilter(value as EtapaStatus | 'todas')} aria-pressed={filter === value}
              className={clsx('btn rounded-full border px-3 py-1', filter === value ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>
              {value !== 'todas' && <span className={clsx('size-2 rounded-full', ETAPA_STATUS_DOT[value as EtapaStatus])} />}{label}<span className="text-xs tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        {canEdit && adding === null && <button className="btn-primary ml-auto rounded-lg" onClick={() => setAdding('')}><Plus size={14} />Nova etapa</button>}
      </div>

      {canEdit && adding !== null && (
        <form onSubmit={add} className="card flex flex-wrap items-center gap-2 p-3">
          <input className="input min-w-52 flex-1" autoFocus placeholder="Nome da etapa (ex.: Desenvolvimento do MVP)…" value={adding}
            onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setAdding(null) }} />
          <StatusTag value={newStatus} onChange={setNewStatus} />
          <button className="btn-primary" disabled={!adding.trim() || create.isPending}>Criar etapa</button>
          <button type="button" className="btn-ghost" onClick={() => setAdding(null)}>Cancelar</button>
        </form>
      )}

      {stagesQ.isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-44" />)}</div>}
      {stagesQ.error && <p className="text-sm text-red-600">Erro ao carregar as etapas: {(stagesQ.error as Error).message}</p>}

      {stagesQ.data && !stages.length && (
        <div className="card grid place-items-center gap-3 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-lg shadow-brand/30"><Layers size={22} /></span>
          <p className="text-lg font-semibold">Nenhuma etapa ainda</p>
          <p className="max-w-md text-sm text-slate-500">{canEdit ? 'Crie as etapas do projeto, como “Levantamento”, “Desenvolvimento do MVP” e “Testes”. Cada etapa é um card com tag de status, horas, explicação e imagens.' : 'A TI ainda não cadastrou as etapas deste projeto.'}</p>
          {canEdit && adding === null && <button className="btn-primary rounded-xl px-4 py-2.5" onClick={() => setAdding('')}><Plus size={16} />Criar primeira etapa</button>}
        </div>
      )}

      {stages.length > 1 && canDrag && <p className="text-xs text-slate-500">Arraste os cards para mudar a ordem das etapas.</p>}

      {stages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} onDragCancel={() => { justDragged.current = true; setTimeout(() => { justDragged.current = false }, 200) }}>
        <SortableContext items={visible.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s, i) => {
            const people = (stageOwners.get(s.id) ?? []).map((id) => profileMap.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
            const imgs = imageCount.get(s.id) ?? 0
            const idx = stages.findIndex((x) => x.id === s.id)
            return (
              <SortableStage key={s.id} id={s.id} disabled={!canDrag}>
              <article onClick={() => { if (!justDragged.current) setOpenId(s.id) }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(s.id) }}
                className={clsx('card card-hover group flex h-full animate-fade-up flex-col gap-3 p-5', canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')} style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <StatusTag value={s.status} onChange={canEdit ? (status) => update.mutate({ id: s.id, patch: { status } }) : undefined} />
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    {canDrag && <GripVertical size={14} className="opacity-0 transition group-hover:opacity-100" aria-hidden="true" />}#{idx + 1}
                  </span>
                </div>
                {(s.bloqueada || (s.risco && s.status !== 'concluido')) && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.bloqueada && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300"><Lock size={11} />Bloqueada</span>}
                    {s.risco && s.status !== 'concluido' && <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', RISCO_CLASS[s.risco])}>{RISCO_LABEL[s.risco]}</span>}
                  </div>
                )}
                <h3 className="text-lg font-semibold leading-snug tracking-tight">{s.nome}</h3>
                {s.bloqueada && s.bloqueio_motivo && <p className="line-clamp-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-300">{s.bloqueio_motivo}</p>}
                {s.descricao
                  ? <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{s.descricao}</p>
                  : <p className="text-sm italic text-slate-400">Sem explicação ainda</p>}

                <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {(s.horas_previstas !== null || s.horas_realizadas !== null) && (
                      <span className="flex items-center gap-1"><Clock size={12} />{s.horas_realizadas ?? 0} / {formatHours(s.horas_previstas)}</span>
                    )}
                    {(s.data_inicio || s.prazo) && <span className="flex items-center gap-1"><CalendarDays size={12} />{formatDate(s.data_inicio)} → {formatDate(s.prazo)}</span>}
                    {imgs > 0 && <span className="flex items-center gap-1"><ImageIcon size={12} />{imgs}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex min-w-0 items-center"><AvatarStack people={people} /></span>
                    {canEdit && filter === 'todas' && (
                      <span className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button className="btn-ghost p-1" disabled={idx === 0} aria-label="Mover antes" onClick={(e) => { e.stopPropagation(); move(s, -1) }}><ArrowLeft size={14} /></button>
                        <button className="btn-ghost p-1" disabled={idx === stages.length - 1} aria-label="Mover depois" onClick={(e) => { e.stopPropagation(); move(s, 1) }}><ArrowRight size={14} /></button>
                      </span>
                    )}
                  </div>
                </div>
              </article>
              </SortableStage>
            )
          })}
          {canEdit && filter === 'todas' && adding === null && (
            <button onClick={() => setAdding('')}
              className="group grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition duration-300 hover:-translate-y-1 hover:border-brand hover:bg-brand/5 hover:text-brand dark:border-slate-700">
              <span className="grid place-items-center gap-2">
                <span className="grid size-11 place-items-center rounded-full bg-slate-100 transition group-hover:scale-110 group-hover:bg-brand/10 dark:bg-slate-800"><Plus size={20} /></span>
                <span className="text-sm font-medium">Nova etapa</span>
              </span>
            </button>
          )}
          {!visible.length && <p className="col-span-full p-6 text-center text-sm text-slate-500">Nenhuma etapa com esse status.</p>}
        </div>
        </SortableContext>
        </DndContext>
      )}

      {open && <StageDialog key={open.id} stage={open} projectId={projectId} onClose={() => setOpenId(null)} />}
    </section>
  )
}
