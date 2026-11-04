import { useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners,
  useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/lib/constants'
import { positionBetween } from '@/lib/utils'
import { useUpdateProject } from './api'
import { ProjectCard, ProjectCardBody } from './ProjectCard'
import type { Profile, ProjectRow, ProjectStatus } from '@/types/database.types'

function SortableCard({ project, owner, canDrag }: { project: ProjectRow; owner?: Profile; canDrag: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id, disabled: !canDrag })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={canDrag ? 'touch-manipulation' : undefined}>
      <ProjectCard project={project} owner={owner} />
    </div>
  )
}

function Column({ status, projects, profiles, canDrag }: {
  status: ProjectStatus; projects: ProjectRow[]; profiles: Map<string, Profile>; canDrag: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100 dark:bg-slate-900/60" aria-label={STATUS_LABEL[status]}>
      <header className="flex items-center gap-2 p-3 text-sm font-semibold">
        <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
        {STATUS_LABEL[status]}
        <span className="ml-auto rounded bg-slate-200 px-1.5 text-xs font-normal dark:bg-slate-800">{projects.length}</span>
      </header>
      <div ref={setNodeRef} className={clsx('min-h-24 flex-1 space-y-2 rounded-b-lg p-2 pt-0', isOver && 'bg-brand/10')}>
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((p) => (
            <SortableCard key={p.id} project={p} owner={p.responsavel_id ? profiles.get(p.responsavel_id) : undefined} canDrag={canDrag} />
          ))}
        </SortableContext>
      </div>
    </section>
  )
}

export function ProjectBoard({ projects, profiles, canDrag }: {
  projects: ProjectRow[]; profiles: Map<string, Profile>; canDrag: boolean
}) {
  const update = useUpdateProject()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as ProjectRow[]])) as Record<ProjectStatus, ProjectRow[]>
    for (const p of [...projects].sort((a, b) => a.posicao - b.posicao)) g[p.status].push(p)
    return g
  }, [projects])

  const active = activeId ? projects.find((p) => p.id === activeId) : undefined

  function onDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)) }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const activeProject = projects.find((p) => p.id === active.id)
    if (!activeProject) return

    const overId = String(over.id)
    const overIsColumn = (STATUS_ORDER as string[]).includes(overId)
    const overProject = overIsColumn ? undefined : projects.find((p) => p.id === overId)
    const destStatus = overIsColumn ? (overId as ProjectStatus) : overProject?.status
    if (!destStatus) return

    const original = grouped[destStatus]
    const dest = original.filter((p) => p.id !== activeProject.id)
    let index = dest.length
    if (overProject) {
      const overIdx = dest.findIndex((p) => p.id === overProject.id)
      const movingDownInSameColumn = activeProject.status === destStatus &&
        original.findIndex((p) => p.id === activeProject.id) < original.findIndex((p) => p.id === overProject.id)
      index = movingDownInSameColumn ? overIdx + 1 : overIdx
    }
    const posicao = positionBetween(dest[index - 1]?.posicao, dest[index]?.posicao)
    update.mutate({ id: activeProject.id, patch: { status: destStatus, posicao } })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {STATUS_ORDER.map((s) => <Column key={s} status={s} projects={grouped[s]} profiles={profiles} canDrag={canDrag} />)}
      </div>
      <DragOverlay>
        {active && <div className="card p-3 shadow-xl"><ProjectCardBody project={active} owner={active.responsavel_id ? profiles.get(active.responsavel_id) : undefined} /></div>}
      </DragOverlay>
    </DndContext>
  )
}
