import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Expand, Lock, Pause, Play, X } from 'lucide-react'
import clsx from 'clsx'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Gantt, type GanttRow } from '@/components/Gantt'
import { BarList } from '@/features/dashboard/Charts'
import { ETAPA_STATUS_HEX, ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER, PRIORITY_COLOR, RISCO_LABEL } from '@/lib/constants'
import { addDaysISO, formatDate, isProjectDone, projectOverdue, todayISO } from '@/lib/utils'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useRealtimeSync } from '@/features/realtime/useRealtimeSync'
import { useAllStages, useProjects, useStageOwners } from '@/features/projects/api'
import { ProgressRing, ownersOf } from '@/features/projects/ProjectCard'

const SLIDE_MS = 15_000

function Big({ label, value, tone }: { label: string; value: number; tone?: 'red' }) {
  return (
    <div className="card p-6">
      <p className="font-mono text-sm uppercase tracking-wider text-slate-500">{label}</p>
      <p className={clsx('mt-2 text-7xl font-bold tabular-nums tracking-tight', tone === 'red' && value > 0 && 'text-red-600')}>{value}</p>
    </div>
  )
}

/** Tela de apresentação para a TV: troca sozinha entre os painéis. Setas trocam, espaço pausa, Esc sai. */
export function TvPage() {
  useRealtimeSync(true)
  const navigate = useNavigate()
  const projects = useProjects()
  const stages = useAllStages()
  const { owners } = useStageOwners()
  const profiles = useProfileMap()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [cycle, setCycle] = useState(0) // reinicia a barra de tempo
  const [now, setNow] = useState(() => new Date())

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(t) }, [])

  const data = useMemo(() => {
    const ps = projects.data ?? []
    const es = stages.data ?? []
    const nomes = new Map(ps.map((p) => [p.id, p.nome]))
    const today = todayISO()
    const limite = addDaysISO(14)
    const abertas = es.filter((e) => e.status !== 'concluido')
    return {
      ps, nomes,
      ativos: ps.filter((p) => !isProjectDone(p) && (p.etapas_total > p.etapas_feitas || Boolean(p.situacao_atual))),
      atrasados: ps.filter((p) => projectOverdue(p)),
      etapasAtrasadas: abertas.filter((e) => e.prazo && e.prazo < today),
      bloqueadas: abertas.filter((e) => e.bloqueada),
      riscoAlto: abertas.filter((e) => e.risco === 'alto' && !e.bloqueada),
      proximas: abertas.filter((e) => e.prazo && e.prazo >= today && e.prazo <= limite).sort((a, b) => (a.prazo ?? '').localeCompare(b.prazo ?? '')),
      concluidasMes: es.filter((e) => e.concluida_em && Date.now() - new Date(e.concluida_em).getTime() <= 30 * 86_400_000).length,
      porStatus: ETAPA_STATUS_ORDER.map((s) => ({ label: ETAPA_STATUS_LABEL[s], value: es.filter((e) => e.status === s).length })),
    }
  }, [projects.data, stages.data])

  const rows: GanttRow[] = useMemo(() => data.ativos.map((p) => ({
    id: p.id, label: p.nome, sub: p.modo === 'manutencao' ? 'Em manutenção' : `${p.progresso}% concluído`, start: p.modo === 'manutencao' ? null : p.data_inicio, end: p.modo === 'manutencao' ? null : p.prazo, color: PRIORITY_COLOR[p.prioridade], progress: p.modo === 'manutencao' ? undefined : p.progresso, strong: true,
  })), [data.ativos])

  const slides = [
    { id: 'geral', title: 'Visão geral', node: (
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid grid-cols-2 gap-6">
          <Big label="Projetos" value={data.ps.length} />
          <Big label="Projetos ativos" value={data.ativos.length} />
          <Big label="Projetos atrasados" value={data.atrasados.length} tone="red" />
          <Big label="Etapas concluídas no mês" value={data.concluidasMes} />
        </div>
        <div className="card p-6">
          <h3 className="mb-4 font-mono text-sm uppercase tracking-wider text-slate-500">Etapas por status</h3>
          <BarList data={data.porStatus} unit="etapas" />
        </div>
      </div>
    ) },
    { id: 'agora', title: 'O que a TI está fazendo agora', node: (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.ativos.slice(0, 6).map((p) => (
          <article key={p.id} className="card flex flex-col gap-4 p-6">
            <div className="flex items-start gap-4">
              {p.modo === 'manutencao'
                ? <div className="flex size-[84px] shrink-0 flex-col items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"><span className="text-3xl font-bold tabular-nums">{p.etapas_total - p.etapas_feitas}</span><span className="font-mono text-[10px] uppercase text-slate-500">em aberto</span></div>
                : <ProgressRing value={p.progresso} size={84} />}
              <div className="min-w-0">
                <h3 className="text-2xl font-semibold leading-tight">{p.nome}</h3>
                <div className="mt-1 text-base text-slate-500"><AvatarStack people={ownersOf(p, profiles)} /></div>
              </div>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-lg text-slate-800 dark:bg-amber-950/30 dark:text-slate-100">{p.situacao_atual || <span className="text-slate-400">Sem situação informada.</span>}</p>
          </article>
        ))}
        {!data.ativos.length && <p className="card col-span-full p-10 text-center text-2xl text-slate-500">Nenhum projeto ativo no momento.</p>}
      </div>
    ) },
    { id: 'atencao', title: 'Pedem atenção', node: (
      data.atrasados.length + data.etapasAtrasadas.length + data.bloqueadas.length + data.riscoAlto.length === 0
        ? <div className="card grid place-items-center gap-3 p-16 text-center"><CheckCircle2 size={72} className="text-emerald-500" /><p className="text-4xl font-semibold">Tudo em dia</p><p className="text-xl text-slate-500">Nada atrasado, bloqueado ou com risco alto.</p></div>
        : (
          <div className="grid gap-5 lg:grid-cols-2">
            {[
              { t: 'Projetos atrasados', rows: data.atrasados.map((p) => ({ id: p.id, a: p.nome, b: `venceu em ${formatDate(p.prazo)}` })) },
              { t: 'Etapas atrasadas', rows: data.etapasAtrasadas.map((e) => ({ id: e.id, a: e.nome, b: `${data.nomes.get(e.project_id) ?? ''} · venceu em ${formatDate(e.prazo)}` })) },
              { t: 'Etapas bloqueadas', rows: data.bloqueadas.map((e) => ({ id: e.id, a: e.nome, b: `${data.nomes.get(e.project_id) ?? ''}${e.bloqueio_motivo ? ` · ${e.bloqueio_motivo}` : ''}` })) },
              { t: 'Risco alto', rows: data.riscoAlto.map((e) => ({ id: e.id, a: e.nome, b: `${data.nomes.get(e.project_id) ?? ''} · ${RISCO_LABEL.alto}` })) },
            ].filter((g) => g.rows.length).map((g) => (
              <section key={g.t} className="card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Lock size={18} className="text-red-500" />{g.t}<span className="rounded-full bg-red-100 px-2.5 text-base text-red-800">{g.rows.length}</span></h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.rows.slice(0, 5).map((r) => <li key={r.id} className="py-2"><p className="text-lg font-medium">{r.a}</p><p className="truncate text-sm text-slate-500">{r.b}</p></li>)}
                </ul>
              </section>
            ))}
          </div>
        )
    ) },
    { id: 'cronograma', title: 'Cronograma', node: <Gantt rows={rows} empty="Nenhum projeto ativo com datas." /> },
    { id: 'prazos', title: 'Próximos prazos (14 dias)', node: (
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {data.proximas.slice(0, 8).map((e) => (
          <div key={e.id} className="flex items-center gap-5 p-4">
            <span className="w-28 shrink-0 text-center font-mono text-2xl font-bold">{formatDate(e.prazo).slice(0, 5)}</span>
            <span className="size-3 shrink-0 rounded-full" style={{ background: ETAPA_STATUS_HEX[e.status] }} />
            <div className="min-w-0 flex-1"><p className="text-2xl font-semibold">{e.nome}</p><p className="text-base text-slate-500">{data.nomes.get(e.project_id)} · {ETAPA_STATUS_LABEL[e.status]}</p></div>
            <span className="shrink-0"><AvatarStack people={(owners.get(e.id) ?? []).map((id) => profiles.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p))} /></span>
          </div>
        ))}
        {!data.proximas.length && <p className="p-10 text-center text-2xl text-slate-500">Nenhum prazo nos próximos 14 dias.</p>}
      </div>
    ) },
  ]

  const go = useCallback((d: number) => { setIndex((i) => (i + d + slides.length) % slides.length); setCycle((c) => c + 1) }, [slides.length])
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => go(1), SLIDE_MS)
    return () => clearTimeout(t)
  }, [index, cycle, paused, go])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); setCycle((c) => c + 1) }
      else if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, navigate])

  const slide = slides[index]!
  const btn = 'rounded-lg p-2 text-white/70 transition hover:bg-white/15 hover:text-white'

  return (
    <div className="flex min-h-screen flex-col text-white">
      <header className="flex items-center gap-4 border-b border-white/10 bg-[#071235]/40 px-8 py-4 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight"><img src="/logo.png" alt="" width={40} height={40} />BackStage Smart</Link>
        <div className="mx-auto flex items-center gap-2">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => { setIndex(i); setCycle((c) => c + 1) }} aria-label={s.title} aria-current={i === index}
              className={clsx('h-2.5 rounded-full transition-all duration-300', i === index ? 'w-10 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/60')} />
          ))}
        </div>
        <span className="font-mono text-3xl tabular-nums">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex items-center">
          <button className={btn} onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={22} /></button>
          <button className={btn} onClick={() => { setPaused((p) => !p); setCycle((c) => c + 1) }} aria-label={paused ? 'Continuar' : 'Pausar'}>{paused ? <Play size={22} /> : <Pause size={22} />}</button>
          <button className={btn} onClick={() => go(1)} aria-label="Próximo"><ChevronRight size={22} /></button>
          <button className={btn} onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Tela cheia"><Expand size={22} /></button>
          <button className={btn} onClick={() => navigate('/')} aria-label="Sair do modo TV"><X size={22} /></button>
        </div>
      </header>

      <main className="flex-1 px-8 py-6">
        <h1 className="mb-5 text-4xl font-bold tracking-tight">{slide.title}</h1>
        <div key={slide.id} className="animate-fade-up text-slate-900 dark:text-slate-100">{slide.node}</div>
      </main>

      <div className="h-1.5 bg-white/10">
        <div key={`${index}-${cycle}`} className="h-full bg-accent" style={{ animation: `tv-progress ${SLIDE_MS}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }} />
      </div>
    </div>
  )
}
