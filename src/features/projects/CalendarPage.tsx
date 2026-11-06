import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarArrowDown, ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import clsx from 'clsx'
import { ETAPA_STATUS_HEX, ETAPA_STATUS_LABEL } from '@/lib/constants'
import { isProjectDone, todayISO } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAllStages, useProjects, useStageOwners } from './api'

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

interface Item { id: string; to: string; label: string; sub: string; date: string; color: string; done: boolean; kind: 'etapa' | 'projeto' }

function ics(items: Item[]) {
  const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BackStage Smart//PT-BR', 'CALSCALE:GREGORIAN']
  for (const it of items) {
    const d = new Date(`${it.date}T00:00:00`)
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    lines.push('BEGIN:VEVENT', `UID:${it.id}@backstage-smart`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${it.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${iso(next).replace(/-/g, '')}`,
      `SUMMARY:${esc(`${it.kind === 'projeto' ? 'Prazo do projeto' : 'Prazo'}: ${it.label}`)}`, `DESCRIPTION:${esc(it.sub)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

/** Calendário mensal com os prazos das etapas e dos projetos. */
export function CalendarPage() {
  const { profile } = useAuth()
  const projects = useProjects()
  const stages = useAllStages()
  const { owners } = useStageOwners()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [mine, setMine] = useState(false)
  const [withDone, setWithDone] = useState(true)

  const items = useMemo<Item[]>(() => {
    const names = new Map((projects.data ?? []).map((p) => [p.id, p.nome]))
    const out: Item[] = []
    for (const p of projects.data ?? []) {
      if (!p.prazo || mine || p.modo === 'manutencao') continue
      out.push({ id: `p-${p.id}`, to: `/projetos/${p.id}`, label: p.nome, sub: 'Prazo do projeto', date: p.prazo, color: '#0f172a', done: isProjectDone(p), kind: 'projeto' })
    }
    for (const s of stages.data ?? []) {
      if (!s.prazo) continue
      if (mine && !(owners.get(s.id) ?? []).includes(profile?.id ?? '')) continue
      out.push({ id: `s-${s.id}`, to: `/projetos/${s.project_id}`, label: s.nome, sub: `${names.get(s.project_id) ?? 'Projeto'} · ${ETAPA_STATUS_LABEL[s.status]}`, date: s.prazo, color: ETAPA_STATUS_HEX[s.status], done: s.status === 'concluido', kind: 'etapa' })
    }
    return out.filter((i) => withDone || !i.done)
  }, [projects.data, stages.data, owners, mine, withDone, profile?.id])

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const it of items) m.set(it.date, [...(m.get(it.date) ?? []), it])
    return m
  }, [items])

  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const rows = cells[35]!.getMonth() === month.getMonth() ? 6 : 5
  const today = todayISO()
  const title = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  function download() {
    const upcoming = items.filter((i) => !i.done)
    const url = URL.createObjectURL(new Blob([ics(upcoming)], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'prazos-backstage.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Prazos</p>
          <h1 className="text-3xl font-bold capitalize tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Só minhas etapas</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={withDone} onChange={(e) => setWithDone(e.target.checked)} />Mostrar concluídas</label>
          <button className="btn-ghost rounded-xl border border-slate-200 dark:border-slate-700" onClick={download} title="Baixa um arquivo que o Google Agenda e o Outlook importam"><CalendarArrowDown size={15} />Exportar (.ics)</button>
          <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
            <button className="btn rounded-lg px-2 py-1.5" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
            <button className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Hoje</button>
            <button className="btn rounded-lg px-2 py-1.5" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
      </header>

      {(projects.isLoading || stages.isLoading) && <div className="skeleton h-96" />}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
          {WEEK.map((d) => <div key={d} className="px-2 py-2 text-center font-mono text-[11px] uppercase tracking-wider text-slate-500">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.slice(0, rows * 7).map((d) => {
            const key = iso(d)
            const day = byDay.get(key) ?? []
            const inMonth = d.getMonth() === month.getMonth()
            return (
              <div key={key} className={clsx('min-h-28 border-b border-r border-slate-100 p-1.5 dark:border-slate-800', !inMonth && 'bg-slate-50/60 dark:bg-slate-900/40')}>
                <span className={clsx('mb-1 inline-grid size-6 place-items-center rounded-full text-xs tabular-nums', key === today ? 'bg-brand font-bold text-white' : inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}>{d.getDate()}</span>
                <ul className="space-y-1">
                  {day.map((it) => (
                    <li key={it.id}>
                      <Link to={it.to} title={`${it.label} · ${it.sub}`}
                        className={clsx('flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white transition hover:brightness-110', it.done && 'opacity-50 line-through')}
                        style={{ background: it.color }}>
                        {it.kind === 'projeto' && <Flag size={10} className="shrink-0" />}<span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-slate-500">A cor da etapa segue o status. A bandeirinha (cor escura) marca o prazo do projeto. O arquivo .ics tem só o que ainda não foi concluído.</p>
    </section>
  )
}
