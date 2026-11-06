import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

const TONES = {
  brand: 'from-brand to-accent shadow-brand/30',
  red: 'from-red-500 to-orange-400 shadow-red-500/30',
  green: 'from-emerald-500 to-teal-400 shadow-emerald-500/30',
  violet: 'from-violet-500 to-fuchsia-400 shadow-violet-500/30',
} as const

/** Indicador pequeno: ícone em degradê, rótulo mono e número grande. */
export function StatTile({ icon: Icon, label, value, tone = 'brand', delay = 0 }: {
  icon: LucideIcon; label: string; value: number; tone?: keyof typeof TONES; delay?: number
}) {
  return (
    <div className="card animate-fade-up flex items-center gap-3 p-4" style={{ animationDelay: `${delay}ms` }}>
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md', TONES[tone])}><Icon size={18} /></span>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  )
}
