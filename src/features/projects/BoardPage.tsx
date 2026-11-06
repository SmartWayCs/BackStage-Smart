import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CalendarDays, Clock, Lock } from 'lucide-react'
import clsx from 'clsx'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { ETAPA_STATUS_DOT, ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER, RISCO_CLASS, RISCO_LABEL } from '@/lib/constants'
import { formatDate, formatHours, todayISO } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useAllStages, useMoveStageStatus, useProfiles, useProjects, useStageOwners } from './api'
import type { EtapaStatus, Profile, Stage } from '@/types/database.types'

interface CardData { stage: Stage; projeto: string; people: Profile[] }

function Card({ d, onOpen, drag }: { d: CardData; onOpen: () => void; drag: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: d.stage.id, disabled: !drag })
  const s = d.stage
  const overdue = s.prazo !== null && s.prazo < todayISO() && s.status !== 'concluido'
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
      className={clsx('card item-hover touch-manipulation space-y-2 p-3 text-sm', drag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer', isDragging && 'opacity-40')}>
      <p className="truncate text-xs text-slate-500">{d.projeto}</p>
      <h3 className="font-semibold leading-snug">{s.nome}</h3>
      {(s.bloqueada || (s.risco && s.status !== 'concluido')) && (
        <div className="flex flex-wrap gap-1.5">
          {s.bloqueada && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300"><Lock size={11} />Bloqueada</span>}
          {s.risco && s.status !== 'concluido' && <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', RISCO_CLASS[s.risco])}>{RISCO_LABEL[s.risco]}</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {s.prazo && <span className={clsx('flex items-center gap-1', overdue && 'font-medium text-red-600')}><CalendarDays size={12} />{formatDate(s.prazo)}</span>}
        {(s.horas_previstas !== null || s.horas_realizadas !== null) && <span className="flex items-center gap-1"><Clock size={12} />{s.horas_realizadas ?? 0} / {formatHours(s.horas_previstas)}</span>}
      </div>
      <div className="text-xs text-slate-500"><AvatarStack people={d.people} /></div>
    </div>
  )
}

function Column({ status, items, children }: { status: EtapaStatus; items: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100 dark:bg-slate-900/60" aria-label={ETAPA_STATUS_LABEL[status]}>
      <h2 className="flex items-center gap-2 p-3 text-sm font-semibold">
        <span className={clsx('size-2.5 rounded-full', ETAPA_STATUS_DOT[status])} />{ETAPA_STATUS_LABEL[status]}
        <span className="ml-auto rounded bg-slate-200 px-1.5 text-xs font-normal dark:bg-slate-800">{items}</span>
      </h2>
      <div ref={setNodeRef} className={clsx('min-h-40 flex-1 space-y-2 rounded-b-xl p-2 pt-0 transition-colors', isOver && 'bg-brand/10')}>{children}</div>
    </section>
  )
}

/** Quadro geral: as etapas de todos os projetos, por status. Arraste para mudar o status. */
export function BoardPage() {
  const { canEdit } = usePermissions()
  const navigate = useNavigate()
  const stages = useAllStages()
  const projects = useProjects()
  const profiles = useProfiles()
  const profileMap = useProfileMap()
  const { owners } = useStageOwners()
  const move = useMoveStageStatus()
  const [projeto, setProjeto] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [bloq, setBloq] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const justDragged = useRef(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const nameOf = useMemo(() => new Map((projects.data ?? []).map((p) => [p.id, p.nome])), [projects.data])
  const cards = useMemo<CardData[]>(() => (stages.data ?? [])
    .filter((s) => (!projeto || s.project_id === projeto) && (!pessoa || (owners.get(s.id) ?? []).includes(pessoa)) && (!bloq || s.bloqueada))
    .map((s) => ({ stage: s, projeto: nameOf.get(s.project_id) ?? 'Projeto', people: (owners.get(s.id) ?? []).map((id) => profileMap.get(id)).filter((p): p is Profile => Boolean(p)) })),
  [stages.data, projeto, pessoa, bloq, owners, nameOf, profileMap])

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    justDragged.current = true
    setTimeout(() => { justDragged.current = false }, 200)
    if (!over) return
    const status = String(over.id).replace('col:', '') as EtapaStatus
    const stage = cards.find((c) => c.stage.id === active.id)?.stage
    if (!stage || stage.status === status || !ETAPA_STATUS_ORDER.includes(status)) return
    move.mutate({ id: stage.id, status })
  }
  const active = cards.find((c) => c.stage.id === activeId)

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Visão geral</p>
          <h1 className="text-3xl font-bold tracking-tight">Quadro geral</h1>
          <p className="mt-1 text-sm text-slate-500">As etapas de todos os projetos, por status.{canEdit ? ' Arraste um card para mudar o status.' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className="input w-auto" value={projeto} onChange={(e) => setProjeto(e.target.value)} aria-label="Projeto">
            <option value="">Todos os projetos</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <select className="input w-auto" value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Responsável">
            <option value="">Todos os responsáveis</option>{(profiles.data ?? []).filter((p) => p.role !== 'supervisao').map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={bloq} onChange={(e) => setBloq(e.target.checked)} />Só bloqueadas</label>
        </div>
      </header>

      {(stages.isLoading || projects.isLoading) && <div className="skeleton h-64" />}
      {stages.data && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="flex items-start gap-3 overflow-x-auto pb-4">
            {ETAPA_STATUS_ORDER.map((st) => {
              const items = cards.filter((c) => c.stage.status === st)
              return (
                <Column key={st} status={st} items={items.length}>
                  {items.map((d) => <Card key={d.stage.id} d={d} drag={canEdit} onOpen={() => { if (!justDragged.current) navigate(`/projetos/${d.stage.project_id}`) }} />)}
                  {!items.length && <p className="p-3 text-center text-xs text-slate-400">Nenhuma etapa</p>}
                </Column>
              )
            })}
          </div>
          <DragOverlay>{active && <div className="rotate-2 scale-105 shadow-2xl"><Card d={active} drag={false} onOpen={() => {}} /></div>}</DragOverlay>
        </DndContext>
      )}
    </section>
  )
}
