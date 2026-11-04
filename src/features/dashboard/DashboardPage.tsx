import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, FolderKanban, PlayCircle } from 'lucide-react'
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from '@/lib/constants'
import { formatDate, isOverdue } from '@/lib/utils'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useProjects } from '@/features/projects/api'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { ProgressBar } from '@/features/projects/ProjectCard'
import { useAllTasks } from './api'
import { BarCard } from './Charts'

const DAY = 86_400_000

function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // segunda-feira
  return x
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof FolderKanban; label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-2 text-sm text-slate-500"><Icon size={16} />{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function DashboardPage() {
  const projectsQ = useProjects()
  const tasksQ = useAllTasks()
  const profiles = useProfileMap()

  const stats = useMemo(() => {
    const projects = projectsQ.data ?? []
    const tasks = tasksQ.data ?? []
    const now = Date.now()
    const done = tasks.filter((t) => t.concluida_em)
    const overdue = projects.filter((p) => isOverdue(p.prazo, p.status === 'concluido'))

    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = weekStart(new Date(now - (7 - i) * 7 * DAY))
      return { start, label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: 0 }
    })
    for (const t of done) {
      const w = weekStart(new Date(t.concluida_em as string)).getTime()
      const bucket = weeks.find((x) => x.start.getTime() === w)
      if (bucket) bucket.value++
    }

    const urgencia = { urgente: 0, alta: 1, media: 2, baixa: 3 }
    return {
      total: projects.length,
      andamento: projects.filter((p) => p.status === 'em_andamento'),
      overdue,
      done7: done.filter((t) => now - new Date(t.concluida_em as string).getTime() <= 7 * DAY).length,
      done30: done.filter((t) => now - new Date(t.concluida_em as string).getTime() <= 30 * DAY).length,
      byStatus: STATUS_ORDER.map((s) => ({ label: STATUS_LABEL[s], value: projects.filter((p) => p.status === s).length })),
      byPriority: PRIORITY_ORDER.map((p) => ({ label: PRIORITY_LABEL[p], value: projects.filter((x) => x.prioridade === p && x.status !== 'concluido').length })),
      weeks: weeks.map(({ label, value }) => ({ label, value })),
      now: projects.filter((p) => p.status === 'em_andamento')
        .sort((a, b) => urgencia[a.prioridade] - urgencia[b.prioridade] || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999')),
    }
  }, [projectsQ.data, tasksQ.data])

  if (projectsQ.isLoading || tasksQ.isLoading) return <p className="text-sm text-slate-500">Carregando…</p>
  if (projectsQ.error || tasksQ.error) return <p className="text-sm text-red-600">Erro ao carregar o dashboard.</p>

  return (
    <section className="space-y-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={FolderKanban} label="Projetos" value={stats.total} />
        <Kpi icon={PlayCircle} label="Em andamento" value={stats.andamento.length} />
        <Kpi icon={AlertTriangle} label="Atrasados" value={stats.overdue.length} hint="prazo vencido, não concluídos" />
        <Kpi icon={CheckCircle2} label="Tarefas na semana" value={stats.done7} hint="concluídas nos últimos 7 dias" />
        <Kpi icon={CheckCircle2} label="Tarefas no mês" value={stats.done30} hint="concluídas nos últimos 30 dias" />
      </div>

      <section aria-label="O que a TI está fazendo agora" className="space-y-2">
        <h2 className="font-semibold">O que a TI está fazendo agora</h2>
        {!stats.now.length && <p className="text-sm text-slate-500">Nenhum projeto em andamento.</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.now.map((p) => (
            <Link key={p.id} to={`/projetos/${p.id}`} className="card block space-y-2 p-3 hover:border-brand">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium">{p.nome}</h3><PriorityBadge value={p.prioridade} />
              </div>
              <p className="rounded bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
                {p.situacao_atual || <span className="text-slate-500">Sem situação informada.</span>}
              </p>
              <ProgressBar value={p.progresso} />
              <p className="text-xs text-slate-500">
                {p.responsavel_id ? profiles.get(p.responsavel_id)?.nome : 'Sem responsável'} · prazo {formatDate(p.prazo)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {stats.overdue.length > 0 && (
        <section aria-label="Projetos atrasados" className="space-y-2">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} />Projetos atrasados</h2>
          <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
            {stats.overdue.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <Link to={`/projetos/${p.id}`} className="font-medium hover:underline">{p.nome}</Link>
                <span className="text-slate-500">{STATUS_LABEL[p.status]} · venceu em {formatDate(p.prazo)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <BarCard title="Projetos por status" data={stats.byStatus} unit="projetos" />
        <BarCard title="Projetos abertos por prioridade" data={stats.byPriority} unit="projetos" />
        <BarCard title="Tarefas concluídas por semana (início da semana)" data={stats.weeks} unit="tarefas" />
      </div>
    </section>
  )
}
