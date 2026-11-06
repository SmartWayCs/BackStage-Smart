import clsx from 'clsx'

/** Barra que cresce de 0 ao montar e desliza ao mudar de valor. */
export function AnimatedBar({ value, max = 100, delay = 0, className }: { value: number; max?: number; delay?: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="shine h-2 overflow-hidden rounded-full bg-slate-200/80 transition-[height] duration-200 group-hover:h-3 dark:bg-slate-800">
      <div className={clsx('h-full animate-bar-grow rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-700', className)}
        style={{ width: `${pct}%`, animationDelay: `${delay}ms` }} />
    </div>
  )
}
