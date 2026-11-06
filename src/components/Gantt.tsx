import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Lock } from 'lucide-react'
import clsx from 'clsx'
import { parseDate, todayISO } from '@/lib/utils'

export interface GanttRow {
  id: string; label: string; sub?: string
  start: string | null; end: string | null
  color: string; progress?: number; to?: string; indent?: boolean; blocked?: boolean; strong?: boolean
}

const DAY = 86_400_000
const LABEL_W = 250
const ROW_H = 46
const ZOOMS = { dias: 38, semanas: 15, meses: 5 } as const
type Zoom = keyof typeof ZOOMS

const diff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const fmtMonth = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')

/** Cronograma: uma linha por item, barra do início ao prazo, linha de "hoje". */
export function Gantt({ rows, empty = 'Nenhuma data cadastrada ainda.' }: { rows: GanttRow[]; empty?: string }) {
  const [zoom, setZoom] = useState<Zoom>('semanas')
  const scroller = useRef<HTMLDivElement>(null)
  const px = ZOOMS[zoom]

  const range = useMemo(() => {
    const today = parseDate(todayISO())
    const dates = rows.flatMap((r) => [r.start, r.end]).filter((d): d is string => Boolean(d)).map(parseDate)
    if (!dates.length) return null
    const min = addDays(new Date(Math.min(today.getTime(), ...dates.map((d) => d.getTime()))), -7)
    const max = addDays(new Date(Math.max(today.getTime(), ...dates.map((d) => d.getTime()))), 21)
    return { min, days: diff(min, max) + 1, today }
  }, [rows])

  if (!range) {
    return (
      <div className="card grid place-items-center gap-2 p-10 text-center">
        <CalendarClock size={28} className="text-slate-400" />
        <p className="text-sm text-slate-500">{empty}</p>
      </div>
    )
  }

  const { min, days, today } = range
  const width = days * px
  const todayLeft = diff(min, today) * px + px / 2
  const toMonday = (8 - min.getDay()) % 7 // dias até a primeira segunda-feira
  const months: { label: string; left: number; width: number }[] = []
  for (let d = new Date(min.getFullYear(), min.getMonth(), 1); d <= addDays(min, days); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const start = d < min ? min : d
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const end = addDays(min, days) < next ? addDays(min, days) : next
    months.push({ label: fmtMonth(d), left: diff(min, start) * px, width: diff(start, end) * px })
  }
  const grid = { backgroundImage: 'repeating-linear-gradient(to right, rgba(148,163,184,.25) 0 1px, transparent 1px)', backgroundSize: `${7 * px}px 100%`, backgroundPosition: `${toMonday * px}px 0` }

  const goToday = () => scroller.current?.scrollTo({ left: Math.max(0, todayLeft - 320), behavior: 'smooth' })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="group" aria-label="Zoom do cronograma">
          {(Object.keys(ZOOMS) as Zoom[]).map((z) => (
            <button key={z} onClick={() => setZoom(z)} aria-pressed={zoom === z}
              className={clsx('btn rounded-md px-3 py-1 text-xs capitalize', zoom === z ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500')}>{z}</button>
          ))}
        </div>
        <button className="btn-ghost rounded-lg border border-slate-200 text-xs dark:border-slate-700" onClick={goToday}><CalendarClock size={14} />Ir para hoje</button>
      </div>

      <div ref={scroller} className="card overflow-x-auto">
        <div className="relative" style={{ width: LABEL_W + width }}>
          {/* cabeçalho: meses */}
          <div className="flex border-b border-slate-200 dark:border-slate-700" style={{ height: 32 }}>
            <div className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900" style={{ width: LABEL_W }}>Item</div>
            <div className="relative" style={{ width }}>
              {months.map((m) => (
                <span key={m.label + m.left} className="absolute top-0 h-full truncate border-l border-slate-200 px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-700" style={{ left: m.left, width: m.width }}>{m.label}</span>
              ))}
            </div>
          </div>

          {rows.map((r) => {
            const s = r.start ?? r.end
            const e = r.end ?? r.start
            const hasBar = Boolean(s && e)
            const left = hasBar ? diff(min, parseDate(s!)) * px : 0
            const w = hasBar ? Math.max(px * 1.2, (diff(parseDate(s!), parseDate(e!)) + 1) * px) : 0
            const label = (
              <span className={clsx('flex min-w-0 items-center gap-1.5', r.indent && 'pl-5')}>
                {r.blocked && <Lock size={12} className="shrink-0 text-red-600" aria-label="Bloqueada" />}
                <span className="min-w-0">
                  <span className={clsx('block truncate text-sm', r.strong ? 'font-semibold' : 'font-medium')}>{r.label}</span>
                  {r.sub && <span className="block truncate text-xs text-slate-500">{r.sub}</span>}
                </span>
              </span>
            )
            return (
              <div key={r.id} className="flex border-b border-slate-100 last:border-0 dark:border-slate-800" style={{ height: ROW_H }}>
                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" style={{ width: LABEL_W }}>
                  {r.to ? <Link to={r.to} className="min-w-0 hover:text-brand">{label}</Link> : label}
                </div>
                <div className="relative" style={{ width, ...grid }}>
                  {hasBar ? (
                    <div className="absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded-md text-[11px] font-medium text-white shadow-sm transition-transform duration-200 hover:scale-y-110"
                      style={{ left, width: w, background: r.color, outline: r.blocked ? '2px solid #dc2626' : undefined }}
                      title={`${r.label}: ${s!.split('-').reverse().join('/')} → ${e!.split('-').reverse().join('/')}${r.progress !== undefined ? ` · ${r.progress}%` : ''}`}>
                      {r.progress !== undefined && <span className="absolute inset-y-0 left-0 bg-black/25" style={{ width: `${r.progress}%` }} />}
                      {w > 70 && r.progress !== undefined && <span className="relative px-2">{r.progress}%</span>}
                    </div>
                  ) : (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs italic text-slate-400">sem datas</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* linha de hoje */}
          <div className="pointer-events-none absolute bottom-0 top-0 z-[5] w-px bg-red-500" style={{ left: LABEL_W + todayLeft }}>
            <span className="absolute -top-0 left-1 rounded bg-red-500 px-1 text-[10px] font-medium text-white">hoje</span>
          </div>
        </div>
      </div>
    </div>
  )
}
