import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FolderKanban, FolderPlus, LayoutGrid, LayoutList, Plus, PlayCircle, Search, Wrench, X } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { StatTile } from '@/components/ui/StatTile'
import { PRIORITY_LABEL, PRIORITY_ORDER } from '@/lib/constants'
import { isProjectDone, projectOverdue } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useCreateProject, useProfiles, useProjects, useStageSummary } from './api'
import { ProjectGridCard, ownersOf } from './ProjectCard'
import { ProjectTable } from './ProjectTable'
import { ProjectForm } from './ProjectForm'
import type { Priority, ProjetoModo } from '@/types/database.types'

type View = 'grade' | 'lista'

function loadView(): View {
  try { return localStorage.getItem('projects-view') === 'lista' ? 'lista' : 'grade' } catch { return 'grade' }
}

export function ProjectsPage() {
  const { canEdit } = usePermissions()
  const projects = useProjects()
  const profiles = useProfiles()
  const profileMap = useProfileMap()
  const stageSummary = useStageSummary()
  const create = useCreateProject()

  const [view, setView] = useState<View>(loadView)
  const [q, setQ] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prioridade, setPrioridade] = useState<Priority | ''>('')
  const [tag, setTag] = useState('')
  const [fase, setFase] = useState<ProjetoModo | ''>('')
  const [atrasados, setAtrasados] = useState(false)
  const [creating, setCreating] = useState(false)

  const changeView = (v: View) => {
    setView(v)
    try { localStorage.setItem('projects-view', v) } catch { /* ignore */ }
  }

  const all = projects.data ?? []
  const allTags = useMemo(() => [...new Set(all.flatMap((p) => p.tags))].sort(), [all])

  const stats = useMemo(() => ({
    total: all.length,
    ativos: all.filter((p) => !isProjectDone(p) && p.etapas_total > p.etapas_feitas).length,
    atrasados: all.filter((p) => projectOverdue(p)).length,
    manutencao: all.filter((p) => p.modo === 'manutencao').length,
    concluidos: all.filter((p) => isProjectDone(p)).length,
  }), [all])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.filter((p) =>
      (!term || p.nome.toLowerCase().includes(term)) &&
      (!responsavel || p.responsaveis_ids.includes(responsavel)) &&
      (!prioridade || p.prioridade === prioridade) &&
      (!tag || p.tags.includes(tag)) &&
      (!fase || p.modo === fase) &&
      (!atrasados || projectOverdue(p)))
  }, [all, q, responsavel, prioridade, tag, fase, atrasados])

  const hasFilter = Boolean(q || responsavel || prioridade || tag || fase || atrasados)
  const clear = () => { setQ(''); setResponsavel(''); setPrioridade(''); setTag(''); setFase(''); setAtrasados(false) }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Portfólio da TI</p>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Visão">
            {([['grade', LayoutGrid, 'Grade'], ['lista', LayoutList, 'Lista']] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => changeView(v)} aria-pressed={view === v}
                className={clsx('btn rounded-lg px-3 py-1.5', view === v ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500')}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
          {canEdit && <button className="btn-primary rounded-xl px-4 py-2.5" onClick={() => setCreating(true)}><Plus size={16} />Novo projeto</button>}
        </div>
      </header>

      {projects.data && projects.data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile icon={FolderKanban} label="Projetos" value={stats.total} delay={0} />
          <StatTile icon={PlayCircle} label="Ativos" value={stats.ativos} delay={60} />
          <StatTile icon={AlertTriangle} label="Atrasados" value={stats.atrasados} tone={stats.atrasados > 0 ? 'red' : 'brand'} delay={120} />
          <StatTile icon={Wrench} label="Em manutenção" value={stats.manutencao} tone="violet" delay={160} />
          <StatTile icon={CheckCircle2} label="Concluídos" value={stats.concluidos} tone="green" delay={180} />
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 rounded-lg pl-9" placeholder="Buscar projeto por nome…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input h-10 w-auto rounded-lg" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Responsável">
          <option value="">Todos os responsáveis</option>
          {profiles.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select className="input h-10 w-auto rounded-lg" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Priority | '')} aria-label="Prioridade">
          <option value="">Todas as prioridades</option>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        <select className="input h-10 w-auto rounded-lg" value={fase} onChange={(e) => setFase(e.target.value as ProjetoModo | '')} aria-label="Fase">
          <option value="">Todas as fases</option>
          <option value="desenvolvimento">Em desenvolvimento</option>
          <option value="manutencao">Em manutenção</option>
        </select>
        <select className="input h-10 w-auto rounded-lg" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
          <option value="">Todas as tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setAtrasados((v) => !v)} aria-pressed={atrasados}
          className={clsx('btn h-10 rounded-lg border', atrasados ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>
          <AlertTriangle size={14} />Prazo vencido
        </button>
        {hasFilter && <button className="btn-ghost h-10" onClick={clear}><X size={14} />Limpar</button>}
        {hasFilter && <span className="ml-auto text-xs text-slate-500">{filtered.length} de {all.length}</span>}
      </div>

      {projects.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-64" />)}</div>
      )}
      {projects.error && <p className="text-sm text-red-600">Erro ao carregar projetos: {(projects.error as Error).message}</p>}

      {projects.data && !projects.data.length && (
        <div className="card grid place-items-center gap-3 p-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-lg shadow-brand/30"><FolderPlus size={26} /></span>
          <p className="text-lg font-semibold">Nenhum projeto ainda</p>
          <p className="max-w-sm text-sm text-slate-500">{canEdit ? 'Crie o primeiro projeto para começar a organizar as etapas da TI.' : 'Quando a TI criar projetos, eles aparecerão aqui.'}</p>
          {canEdit && <button className="btn-primary mt-1 rounded-xl px-4 py-2.5" onClick={() => setCreating(true)}><Plus size={16} />Criar projeto</button>}
        </div>
      )}

      {projects.data && projects.data.length > 0 && (view === 'grade'
        ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((p, i) => (
              <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                <ProjectGridCard project={p} owners={ownersOf(p, profileMap)} stages={stageSummary.get(p.id) ?? []} />
              </div>
            ))}
            {canEdit && !hasFilter && (
              <button onClick={() => setCreating(true)}
                className="group grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition duration-300 hover:-translate-y-1 hover:border-brand hover:bg-brand/5 hover:text-brand dark:border-slate-700">
                <span className="grid place-items-center gap-2">
                  <span className="grid size-11 place-items-center rounded-full bg-slate-100 transition group-hover:scale-110 group-hover:bg-brand/10 dark:bg-slate-800"><Plus size={20} /></span>
                  <span className="text-sm font-medium">Novo projeto</span>
                </span>
              </button>
            )}
            {!filtered.length && <p className="col-span-full p-6 text-center text-sm text-slate-500">Nenhum projeto encontrado com esses filtros.</p>}
          </div>
        )
        : <ProjectTable projects={filtered} profiles={profileMap} />)}

      {creating && (
        <Dialog title="Novo projeto" onClose={() => setCreating(false)}>
          <ProjectForm busy={create.isPending} onCancel={() => setCreating(false)}
            onSubmit={(v) => {
              const { responsaveis_ids, ...project } = v
              create.mutate({ project, responsaveis: responsaveis_ids }, { onSuccess: () => setCreating(false) })
            }} />
        </Dialog>
      )}
    </section>
  )
}
