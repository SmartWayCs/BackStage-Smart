import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, Clock, ListChecks, Lock } from 'lucide-react'
import clsx from 'clsx'
import { StatTile } from '@/components/ui/StatTile'
import { StatusTag } from '@/components/ui/StatusTag'
import { RISCO_CLASS, RISCO_LABEL } from '@/lib/constants'
import { addDaysISO, formatDate, formatHours, todayISO } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAllStages, useProfiles, useProjects, useStageOwners } from './api'
import type { Stage } from '@/types/database.types'

type Item = Pick<Stage, 'id' | 'project_id' | 'nome' | 'status' | 'prazo' | 'horas_previstas' | 'horas_realizadas' | 'bloqueada' | 'bloqueio_motivo' | 'risco'>

function Group({ title, tone, items, project }: { title: string; tone: 'red' | 'amber' | 'blue' | 'slate' | 'green'; items: Item[]; project: (id: string) => string }) {
  if (!items.length) return null
  const bar = { red: 'bg-red-500', amber: 'bg-amber-500', blue: 'bg-brand', slate: 'bg-slate-400', green: 'bg-emerald-500' }[tone]
  const today = todayISO()
  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className="flex items-center gap-2 text-sm font-semibold"><span className={clsx('h-4 w-1 rounded-full', bar)} />{title}<span className="rounded-full bg-slate-100 px-2 text-xs font-normal text-slate-500 dark:bg-slate-800">{items.length}</span></h2>
      <ul className="grid gap-2 lg:grid-cols-2">
        {items.map((s) => {
          const overdue = s.prazo !== null && s.prazo < today && s.status !== 'concluido'
          return (
            <li key={s.id}>
              <Link to={`/projetos/${s.project_id}`} className="card card-hover flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-500">{project(s.project_id)}</p>
                    <h3 className="font-semibold leading-snug">{s.nome}</h3>
                  </div>
                  <StatusTag value={s.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {s.prazo && <span className={clsx('flex items-center gap-1', overdue && 'font-medium text-red-600')}><CalendarDays size={12} />{overdue ? 'Venceu ' : ''}{formatDate(s.prazo)}</span>}
                  {(s.horas_previstas !== null || s.horas_realizadas !== null) && <span className="flex items-center gap-1"><Clock size={12} />{s.horas_realizadas ?? 0} / {formatHours(s.horas_previstas)}</span>}
                  {s.bloqueada && <span className="flex items-center gap-1 font-medium text-red-700 dark:text-red-400"><Lock size={12} />Bloqueada</span>}
                  {s.risco && s.status !== 'concluido' && <span className={clsx('rounded-full px-2 py-0.5 font-medium', RISCO_CLASS[s.risco])}>{RISCO_LABEL[s.risco]}</span>}
                </div>
                {s.bloqueada && s.bloqueio_motivo && <p className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-300">{s.bloqueio_motivo}</p>}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Tudo o que está com uma pessoa, organizado pelo que pede atenção primeiro. */
export function MyStagesPage() {
  const { profile } = useAuth()
  const stagesQ = useAllStages()
  const projectsQ = useProjects()
  const profilesQ = useProfiles()
  const { owners } = useStageOwners()
  const [who, setWho] = useState('')
  const userId = who || profile?.id

  const projectName = useMemo(() => new Map((projectsQ.data ?? []).map((p) => [p.id, p.nome])), [projectsQ.data])
  const name = (id: string) => projectName.get(id) ?? 'Projeto'

  const g = useMemo(() => {
    const mine = (stagesQ.data ?? []).filter((s) => userId !== undefined && (owners.get(s.id) ?? []).includes(userId))
    const today = todayISO()
    const week = addDaysISO(7)
    const open = mine.filter((s) => s.status !== 'concluido')
    const overdue = open.filter((s) => s.prazo && s.prazo < today)
    const r1 = open.filter((s) => !overdue.includes(s))
    const blocked = r1.filter((s) => s.bloqueada)
    const r2 = r1.filter((s) => !blocked.includes(s))
    const thisWeek = r2.filter((s) => s.prazo && s.prazo <= week)
    const r3 = r2.filter((s) => !thisWeek.includes(s))
    const doing = r3.filter((s) => s.status === 'em_andamento')
    const others = r3.filter((s) => s.status !== 'em_andamento')
    const since = Date.now() - 30 * 86_400_000
    const done = mine.filter((s) => s.status === 'concluido' && s.concluida_em && new Date(s.concluida_em).getTime() >= since)
    const hoursLeft = open.reduce((n, s) => n + Math.max(0, (s.horas_previstas ?? 0) - (s.horas_realizadas ?? 0)), 0)
    return { open, overdue, blocked, thisWeek, doing, others, done, hoursLeft }
  }, [stagesQ.data, userId, owners])

  const isMe = userId === profile?.id
  const people = (profilesQ.data ?? []).filter((p) => p.role !== 'supervisao' || p.id === profile?.id)

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Acompanhamento pessoal</p>
          <h1 className="text-3xl font-bold tracking-tight">{isMe ? 'Minhas etapas' : 'Etapas de ' + (people.find((p) => p.id === userId)?.nome ?? '…')}</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500">Ver etapas de
          <select className="input w-auto" value={userId ?? ''} onChange={(e) => setWho(e.target.value)}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.id === profile?.id ? `${p.nome} (eu)` : p.nome}</option>)}
          </select>
        </label>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ListChecks} label="Em aberto" value={g.open.length} delay={0} />
        <StatTile icon={AlertTriangle} label="Atrasadas" value={g.overdue.length} tone={g.overdue.length ? 'red' : 'brand'} delay={60} />
        <StatTile icon={CalendarClock} label="Vencem em 7 dias" value={g.thisWeek.length} delay={120} />
        <StatTile icon={Clock} label="Horas restantes" value={Math.round(g.hoursLeft)} tone="violet" delay={180} />
      </div>

      {(stagesQ.isLoading || projectsQ.isLoading) && <div className="skeleton h-40" />}
      {stagesQ.data && !g.open.length && !g.done.length && (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <p className="font-semibold">Nenhuma etapa por aqui</p>
          <p className="max-w-sm text-sm text-slate-500">As etapas aparecem quando alguém é definido como responsável delas, nos detalhes da etapa.</p>
        </div>
      )}

      <Group title="Atrasadas" tone="red" items={g.overdue} project={name} />
      <Group title="Bloqueadas" tone="red" items={g.blocked} project={name} />
      <Group title="Vencem nos próximos 7 dias" tone="amber" items={g.thisWeek} project={name} />
      <Group title="Em andamento" tone="blue" items={g.doing} project={name} />
      <Group title="Próximas e sem prazo" tone="slate" items={g.others} project={name} />
      <Group title="Concluídas nos últimos 30 dias" tone="green" items={g.done} project={name} />
    </section>
  )
}
