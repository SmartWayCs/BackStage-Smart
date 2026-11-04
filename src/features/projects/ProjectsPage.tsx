import { useMemo, useState } from 'react'
import { LayoutList, Plus, Search, SquareKanban } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { PRIORITY_LABEL, PRIORITY_ORDER } from '@/lib/constants'
import { isOverdue } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useCreateProject, useProfiles, useProjects } from './api'
import { ProjectBoard } from './ProjectBoard'
import { ProjectTable } from './ProjectTable'
import { ProjectForm } from './ProjectForm'
import type { Priority } from '@/types/database.types'

type View = 'kanban' | 'lista'

function loadView(): View {
  try { return localStorage.getItem('projects-view') === 'lista' ? 'lista' : 'kanban' } catch { return 'kanban' }
}

export function ProjectsPage() {
  const { canEdit } = usePermissions()
  const projects = useProjects()
  const profiles = useProfiles()
  const profileMap = useProfileMap()
  const create = useCreateProject()

  const [view, setView] = useState<View>(loadView)
  const [q, setQ] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prioridade, setPrioridade] = useState<Priority | ''>('')
  const [tag, setTag] = useState('')
  const [atrasados, setAtrasados] = useState(false)
  const [creating, setCreating] = useState(false)

  const changeView = (v: View) => {
    setView(v)
    try { localStorage.setItem('projects-view', v) } catch { /* ignore */ }
  }

  const allTags = useMemo(() => [...new Set((projects.data ?? []).flatMap((p) => p.tags))].sort(), [projects.data])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (projects.data ?? []).filter((p) =>
      (!term || p.nome.toLowerCase().includes(term)) &&
      (!responsavel || p.responsavel_id === responsavel) &&
      (!prioridade || p.prioridade === prioridade) &&
      (!tag || p.tags.includes(tag)) &&
      (!atrasados || isOverdue(p.prazo, p.status === 'concluido')))
  }, [projects.data, q, responsavel, prioridade, tag, atrasados])

  const hasFilter = Boolean(q || responsavel || prioridade || tag || atrasados)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Projetos</h1>
        <div className="flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700" role="group" aria-label="Visão">
          {([['kanban', SquareKanban, 'Kanban'], ['lista', LayoutList, 'Lista']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => changeView(v)} aria-pressed={view === v}
              className={clsx('btn px-2.5 py-1', view === v ? 'bg-slate-200 dark:bg-slate-700' : 'text-slate-500')}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} />Novo projeto</button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Responsável">
          <option value="">Todos os responsáveis</option>
          {profiles.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select className="input w-auto" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Priority | '')} aria-label="Prioridade">
          <option value="">Todas as prioridades</option>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        <select className="input w-auto" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
          <option value="">Todas as tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={atrasados} onChange={(e) => setAtrasados(e.target.checked)} />Prazo vencido
        </label>
        {hasFilter && <button className="btn-ghost" onClick={() => { setQ(''); setResponsavel(''); setPrioridade(''); setTag(''); setAtrasados(false) }}>Limpar</button>}
      </div>

      {projects.isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      {projects.error && <p className="text-sm text-red-600">Erro ao carregar projetos: {(projects.error as Error).message}</p>}
      {projects.data && (view === 'kanban'
        ? <ProjectBoard projects={filtered} profiles={profileMap} canDrag={canEdit} />
        : <ProjectTable projects={filtered} profiles={profileMap} />)}

      {creating && (
        <Dialog title="Novo projeto" onClose={() => setCreating(false)}>
          <ProjectForm busy={create.isPending} onCancel={() => setCreating(false)}
            onSubmit={(v) => {
              const last = Math.max(0, ...(projects.data ?? []).filter((p) => p.status === v.status).map((p) => p.posicao))
              create.mutate({ ...v, posicao: last + 1000 }, { onSuccess: () => setCreating(false) })
            }} />
        </Dialog>
      )}
    </section>
  )
}
