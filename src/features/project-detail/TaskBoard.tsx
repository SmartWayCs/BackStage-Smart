import { useMemo, useState, type FormEvent } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners,
  useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from '@/lib/constants'
import { formatDate, isOverdue, positionBetween } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useProfiles } from '@/features/projects/api'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from './api'
import type { Profile, Task, TaskStatus } from '@/types/database.types'

interface CardProps {
  task: Task; profiles: Profile[]; profileMap: Map<string, Profile>; canEdit: boolean
  onPatch: (patch: Partial<Task>) => void; onDelete: () => void
}

function TaskCardBody({ task, profiles, profileMap, canEdit, onPatch, onDelete }: CardProps) {
  const overdue = isOverdue(task.prazo, task.status === 'feito')
  return (
    <div className="card space-y-2 p-2.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={clsx('font-medium', task.status === 'feito' && 'text-slate-400 line-through')}>{task.titulo}</span>
        {canEdit && <button className="text-slate-400 hover:text-red-600" aria-label="Excluir tarefa"
          onPointerDown={(e) => e.stopPropagation()} onClick={onDelete}><Trash2 size={14} /></button>}
      </div>
      {canEdit ? (
        <div className="grid grid-cols-2 gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          <select className="input px-1.5 py-1 text-xs" aria-label="Responsável" value={task.responsavel_id ?? ''}
            onChange={(e) => onPatch({ responsavel_id: e.target.value || null })}>
            <option value="">Sem resp.</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <input className="input px-1.5 py-1 text-xs" type="date" aria-label="Prazo" value={task.prazo ?? ''}
            onChange={(e) => onPatch({ prazo: e.target.value || null })} />
          <select className="input col-span-2 px-1.5 py-1 text-xs" aria-label="Mover para" value={task.status}
            onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}>
            {TASK_STATUS_ORDER.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}</select>
        </div>
      ) : (
        <div className="flex justify-between text-xs text-slate-500">
          <span>{task.responsavel_id ? profileMap.get(task.responsavel_id)?.nome : 'Sem responsável'}</span>
          <span className={clsx(overdue && 'font-medium text-red-600')}>{formatDate(task.prazo)}</span>
        </div>
      )}
    </div>
  )
}

function SortableTask(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id, disabled: !props.canEdit })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <TaskCardBody {...props} />
    </div>
  )
}

function TaskColumn({ status, tasks, children, render }: {
  status: TaskStatus; tasks: Task[]; children?: React.ReactNode; render: (t: Task) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex flex-col rounded-lg bg-slate-100 dark:bg-slate-900/60">
      <h3 className="flex items-center justify-between p-2.5 text-sm font-semibold">
        {TASK_STATUS_LABEL[status]}<span className="rounded bg-slate-200 px-1.5 text-xs font-normal dark:bg-slate-800">{tasks.length}</span>
      </h3>
      <div ref={setNodeRef} className={clsx('min-h-16 flex-1 space-y-2 rounded-b-lg p-2 pt-0', isOver && 'bg-brand/10')}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>{tasks.map(render)}</SortableContext>
        {children}
      </div>
    </div>
  )
}

export function TaskBoard({ projectId }: { projectId: string }) {
  const { canEdit } = usePermissions()
  const tasksQ = useTasks(projectId)
  const profilesQ = useProfiles()
  const profileMap = useProfileMap()
  const create = useCreateTask(projectId)
  const update = useUpdateTask(projectId)
  const del = useDeleteTask(projectId)
  const [titulo, setTitulo] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const tasks = tasksQ.data ?? []
  const assignable = (profilesQ.data ?? []).filter((p) => p.role !== 'supervisao')

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { a_fazer: [], fazendo: [], feito: [] }
    for (const t of [...(tasksQ.data ?? [])].sort((a, b) => a.posicao - b.posicao)) g[t.status].push(t)
    return g
  }, [tasksQ.data])

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    const overId = String(over.id)
    const overTask = tasks.find((t) => t.id === overId)
    const dest = (TASK_STATUS_ORDER as string[]).includes(overId) ? (overId as TaskStatus) : overTask?.status
    if (!dest) return
    const original = grouped[dest]
    const list = original.filter((t) => t.id !== task.id)
    let index = list.length
    if (overTask) {
      const overIdx = list.findIndex((t) => t.id === overTask.id)
      const down = task.status === dest && original.findIndex((t) => t.id === task.id) < original.findIndex((t) => t.id === overTask.id)
      index = down ? overIdx + 1 : overIdx
    }
    update.mutate({ id: task.id, patch: { status: dest, posicao: positionBetween(list[index - 1]?.posicao, list[index]?.posicao) } })
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const t = titulo.trim()
    if (!t) return
    const last = Math.max(0, ...grouped.a_fazer.map((x) => x.posicao))
    create.mutate({ titulo: t, posicao: last + 1000 }, { onSuccess: () => setTitulo('') })
  }

  const render = (t: Task) => (
    <SortableTask key={t.id} task={t} profiles={assignable} profileMap={profileMap} canEdit={canEdit}
      onPatch={(patch) => update.mutate({ id: t.id, patch })} onDelete={() => del.mutate(t.id)} />
  )
  const activeTask = tasks.find((t) => t.id === activeId)

  return (
    <section className="space-y-2" aria-label="Tarefas">
      <h2 className="font-semibold">Tarefas</h2>
      {tasksQ.isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-3 md:grid-cols-3">
          {TASK_STATUS_ORDER.map((s) => (
            <TaskColumn key={s} status={s} tasks={grouped[s]} render={render}>
              {s === 'a_fazer' && canEdit && (
                <form onSubmit={add} className="flex gap-1.5">
                  <input className="input py-1.5" placeholder="Nova tarefa…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                  <button className="btn-primary px-3 py-1.5" disabled={!titulo.trim() || create.isPending}>+</button>
                </form>
              )}
            </TaskColumn>
          ))}
        </div>
        <DragOverlay>{activeTask && <TaskCardBody task={activeTask} profiles={assignable} profileMap={profileMap} canEdit={false} onPatch={() => {}} onDelete={() => {}} />}</DragOverlay>
      </DndContext>
    </section>
  )
}
