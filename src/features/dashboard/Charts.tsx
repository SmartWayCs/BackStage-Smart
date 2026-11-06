import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AnimatedBar } from '@/components/ui/AnimatedBar'

export interface Datum { label: string; value: number }
const tick = { fill: 'var(--chart-muted)', fontSize: 12 }

/** Card base dos gráficos: título + conteúdo, com entrada animada. */
export function ChartCard({ title, subtitle, delay = 0, children }: { title: string; subtitle?: string; delay?: number; children: React.ReactNode }) {
  return (
    <figure className="card card-hover animate-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <figcaption className="mb-4">
        <span className="block font-mono text-[11px] font-medium uppercase tracking-wider text-slate-500">{title}</span>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </figcaption>
      {children}
    </figure>
  )
}

/** Barras horizontais animadas, uma série; rótulo e valor ficam em texto (sem depender de cor). */
export function BarList({ data, unit }: { data: Datum[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="group row-hover -mx-2 space-y-1.5 rounded-md px-2 py-1">
          <div className="flex items-baseline justify-between text-sm">
            <span>{d.label}</span>
            <span className="tabular-nums text-slate-500"><strong className="font-semibold text-slate-900 dark:text-slate-100">{d.value}</strong> {unit}</span>
          </div>
          <AnimatedBar value={d.value} max={max} delay={i * 90} />
        </li>
      ))}
    </ul>
  )
}

/** Área com gradiente, linha de 2px e tooltip no hover. */
export function AreaTrend({ data, unit }: { data: Datum[]; unit: string }) {
  return (
    <>
      <div className="h-56" role="img" aria-label={`Evolução: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-pink)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent-pink)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ stroke: 'var(--chart-muted)', strokeDasharray: '3 3' }}
              contentStyle={{ background: 'var(--chart-ink)', border: 0, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--chart-grid)' }} itemStyle={{ color: 'var(--chart-grid)' }}
              formatter={(v) => [`${v} ${unit}`, '']} separator="" />
            <Area type="monotone" dataKey="value" stroke="var(--accent-pink)" strokeWidth={2} fill="url(#trendFill)"
              dot={{ r: 3, strokeWidth: 2, stroke: 'var(--chart-surface)', fill: 'var(--accent-pink)' }}
              activeDot={{ r: 5 }} animationDuration={1200} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">Ver como tabela</summary>
        <table className="mt-2 w-full text-left">
          <tbody>{data.map((d) => <tr key={d.label}><td className="py-0.5">{d.label}</td><td className="text-right tabular-nums">{d.value}</td></tr>)}</tbody>
        </table>
      </details>
    </>
  )
}
