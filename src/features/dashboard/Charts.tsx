import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface Datum { label: string; value: number }

const tick = { fill: 'var(--chart-muted)', fontSize: 12 }

/** Barras finas, uma só série (o título nomeia a série), com tooltip no hover e tabela alternativa. */
export function BarCard({ title, data, unit }: { title: string; data: Datum[]; unit: string }) {
  return (
    <figure className="card p-4">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <div className="h-56" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval={0} />
            <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }}
              contentStyle={{ background: 'var(--chart-ink)', border: 0, borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: 'var(--chart-grid)' }} itemStyle={{ color: 'var(--chart-grid)' }}
              formatter={(v) => [`${v} ${unit}`, '']} separator="" />
            <Bar dataKey="value" barSize={28} radius={[4, 4, 0, 0]} style={{ fill: 'var(--series-1)' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">Ver como tabela</summary>
        <table className="mt-2 w-full text-left">
          <tbody>{data.map((d) => <tr key={d.label}><td className="py-0.5">{d.label}</td><td className="text-right tabular-nums">{d.value}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  )
}
