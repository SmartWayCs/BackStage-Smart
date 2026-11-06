import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, FolderKanban, Lock, PlayCircle, Zap } from 'lucide-react'
import clsx from 'clsx'
import { ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER, PRIORITY_COLOR, PRIORITY_LABEL, PRIORITY_ORDER, RISCO_CLASS, RISCO_LABEL } from '@/lib/constants'
import { formatDate, isProjectDone, projectOverdue } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAllStages, useProjects } from '@/features/projects/api'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { ProgressBar, ownersOf } from '@/features/projects/ProjectCard'
import { AreaTrend, BarList, ChartCard } from './Charts'

const DAY = 86_400_000

function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // segunda-feira
  return x
}

function Hero({ nome, ativos }: { nome: string; ativos: number }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="relative animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d4ed8] via-[#1e2a78] to-[#0b1a3f] p-6 text-white shadow-xl shadow-black/20 sm:p-8">
      <div className="bg-grid mask-fade absolute inset-0 animate-grid-pan opacity-50" />
      <div className="absolute -right-16 -top-16 size-72 animate-blob rounded-full bg-[#22d3ee]/40 blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 size-64 animate-blob rounded-full bg-[#6366f1]/50 blur-3xl [animation-delay:-7s]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            Ao vivo · painel da supervisão
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Olá, {nome}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm capitalize text-slate-300"><CalendarDays size={14} />{hoje}</p>
        </div>
        <p className="glass rounded-xl px-4 py-2.5 text-sm transition duration-300 hover:scale-105 hover:bg-white/20">
          <Zap size={14} className="mr-1.5 inline text-accent" />
          <strong>{ativos}</strong> {ativos === 1 ? 'projeto ativo' : 'projetos ativos'} agora
        </p>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, hint, delay, alert }: {
  icon: typeof FolderKanban; label: string; value: number; hint?: string; delay: number; alert?: boolean
}) {
  const n = useCountUp(value)
  return (
    <div className="card group relative animate-fade-up overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10"
      style={{ animationDelay: `${delay}ms` }}>
      <div className={clsx('absolute -right-8 -top-8 size-28 rounded-full blur-2xl transition-colors duration-300',
        alert ? 'bg-red-500/15 group-hover:bg-red-500/25' : 'bg-brand/10 group-hover:bg-accent/25')} />
      <div className="relative">
        <span className={clsx('inline-grid size-9 place-items-center rounded-lg text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110',
          alert ? 'bg-gradient-to-br from-red-500 to-orange-400 shadow-red-500/30' : 'bg-gradient-to-br from-brand to-accent shadow-brand/30')}>
          <Icon size={18} />
        </span>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-4xl font-bold tabular-nums tracking-tight">{n}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando dashboard">
      <div className="skeleton h-36" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-32" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-64" />)}</div>
    </div>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()
  const projectsQ = useProjects()
  const stagesQ = useAllStages()
  const profiles = useProfileMap()

  const stats = useMemo(() => {
    const projects = projectsQ.data ?? []
    const etapas = stagesQ.data ?? []
    const now = Date.now()
    const done = etapas.filter((e) => e.concluida_em)
    const overdue = projects.filter((p) => projectOverdue(p))

    const nomes = new Map(projects.map((p) => [p.id, p.nome]))
    const atencao = etapas
      .filter((e) => e.status !== 'concluido' && (e.bloqueada || e.risco === 'alto'))
      .map((e) => ({ ...e, projeto: nomes.get(e.project_id) ?? '' }))

    const byStatus = ETAPA_STATUS_ORDER.map((st) => ({ label: ETAPA_STATUS_LABEL[st], value: etapas.filter((e) => e.status === st).length }))

    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = weekStart(new Date(now - (7 - i) * 7 * DAY))
      return { start, label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: 0 }
    })
    for (const e of done) {
      const w = weekStart(new Date(e.concluida_em as string)).getTime()
      const bucket = weeks.find((x) => x.start.getTime() === w)
      if (bucket) bucket.value++
    }

    const urgencia = { urgente: 0, alta: 1, media: 2, baixa: 3, neutra: 4 }
    // "ativo" = não concluído e com etapas em aberto (ou com situação atual informada)
    const andamento = projects.filter((p) => !isProjectDone(p) && (p.etapas_total > p.etapas_feitas || Boolean(p.situacao_atual)))
      .sort((a, b) => urgencia[a.prioridade] - urgencia[b.prioridade] || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'))
    return {
      total: projects.length,
      manut: projects.filter((p) => p.modo === 'manutencao').length,
      andamento,
      atencao,
      overdue,
      done7: done.filter((e) => now - new Date(e.concluida_em as string).getTime() <= 7 * DAY).length,
      done30: done.filter((e) => now - new Date(e.concluida_em as string).getTime() <= 30 * DAY).length,
      byStatus,
      byPriority: PRIORITY_ORDER.map((p) => ({ label: PRIORITY_LABEL[p], value: projects.filter((x) => x.prioridade === p && !isProjectDone(x)).length })),
      weeks: weeks.map(({ label, value }) => ({ label, value })),
    }
  }, [projectsQ.data, stagesQ.data])

  if (projectsQ.isLoading || stagesQ.isLoading) return <DashboardSkeleton />
  if (projectsQ.error || stagesQ.error) return <p className="text-sm text-red-600">Erro ao carregar o dashboard.</p>

  const primeiroNome = profile?.nome.split(' ')[0] ?? ''

  return (
    <section className="space-y-6">
      <Hero nome={primeiroNome} ativos={stats.andamento.length} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={FolderKanban} label="Projetos" value={stats.total} hint={stats.manut ? `${stats.manut} em manutenção` : undefined} delay={80} />
        <Kpi icon={PlayCircle} label="Projetos ativos" value={stats.andamento.length} hint="com etapas em aberto" delay={140} />
        <Kpi icon={AlertTriangle} label="Atrasados" value={stats.overdue.length} hint="prazo vencido, não concluídos" delay={200} alert={stats.overdue.length > 0} />
        <Kpi icon={CheckCircle2} label="Etapas na semana" value={stats.done7} hint="concluídas nos últimos 7 dias" delay={260} />
        <Kpi icon={CheckCircle2} label="Etapas no mês" value={stats.done30} hint="concluídas nos últimos 30 dias" delay={320} />
      </div>

      {stats.atencao.length > 0 && (
        <section aria-label="Etapas que pedem atenção" className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold"><Lock size={16} className="text-red-500" />Pedem atenção: bloqueadas e com risco alto</h2>
          <ul className="card animate-fade-up divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
            {stats.atencao.map((e) => (
              <li key={e.id}>
                <Link to={`/projetos/${e.project_id}`} className="row-hover flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span><strong>{e.nome}</strong> <span className="text-slate-500">· {e.projeto}</span></span>
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    {e.bloqueada && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300"><Lock size={11} />Bloqueada</span>}
                    {e.risco && <span className={`rounded-full px-2 py-0.5 font-medium ${RISCO_CLASS[e.risco]}`}>{RISCO_LABEL[e.risco]}</span>}
                    {e.bloqueada && e.bloqueio_motivo && <span className="max-w-xs truncate text-slate-500">{e.bloqueio_motivo}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="O que a TI está fazendo agora" className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          O que a TI está fazendo agora
        </h2>
        {!stats.andamento.length && <p className="card p-6 text-center text-sm text-slate-500">Nenhum projeto ativo no momento.</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.andamento.map((p, i) => {
            const owners = ownersOf(p, profiles)
            return (
              <Link key={p.id} to={`/projetos/${p.id}`} style={{ animationDelay: `${i * 70}ms`, borderLeftColor: PRIORITY_COLOR[p.prioridade] }}
                className="card group block animate-fade-up space-y-3 border-l-4 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">{p.nome}</h3>
                  <ArrowUpRight size={16} className="shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="rounded-md bg-slate-50 p-2.5 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                  {p.situacao_atual || <span className="text-slate-400">Sem situação informada.</span>}
                </p>
                {p.modo === 'manutencao'
                  ? <p className="text-xs text-slate-500">Em manutenção · {p.etapas_total - p.etapas_feitas} etapas em aberto</p>
                  : <ProgressBar value={p.progresso} />}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex min-w-0 items-center"><AvatarStack people={owners} /></span>
                  <span className="flex shrink-0 items-center gap-2"><PriorityBadge value={p.prioridade} />{formatDate(p.prazo)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {stats.overdue.length > 0 && (
        <section aria-label="Projetos atrasados" className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-red-500" />Projetos atrasados</h2>
          <ul className="card animate-fade-up divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
            {stats.overdue.map((p) => (
              <li key={p.id}>
                <Link to={`/projetos/${p.id}`} className="row-hover flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:pl-5">
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-slate-500">{p.progresso}% concluído · venceu em <strong className="text-red-600 dark:text-red-400">{formatDate(p.prazo)}</strong></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Etapas por status" subtitle="Todas as etapas de todos os projetos" delay={100}>
          <BarList data={stats.byStatus} unit="etapas" />
        </ChartCard>
        <ChartCard title="Abertos por prioridade" subtitle="Exclui os concluídos" delay={180}>
          <BarList data={stats.byPriority} unit="proj." />
        </ChartCard>
        <ChartCard title="Etapas concluídas por semana" subtitle="Últimas 8 semanas (data = segunda-feira)" delay={260}>
          <AreaTrend data={stats.weeks} unit="etapas" />
        </ChartCard>
      </div>
    </section>
  )
}
