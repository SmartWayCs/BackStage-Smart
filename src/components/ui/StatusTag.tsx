import clsx from 'clsx'
import { ETAPA_STATUS_CLASS, ETAPA_STATUS_DOT, ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER } from '@/lib/constants'
import type { EtapaStatus } from '@/types/database.types'

/** Tag colorida do status da etapa. Com `onChange`, vira um seletor no formato de tag. */
export function StatusTag({ value, onChange, className }: { value: EtapaStatus; onChange?: (v: EtapaStatus) => void; className?: string }) {
  const base = clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', ETAPA_STATUS_CLASS[value], className)
  if (!onChange) {
    return <span className={base}><span className={clsx('size-1.5 rounded-full', ETAPA_STATUS_DOT[value])} />{ETAPA_STATUS_LABEL[value]}</span>
  }
  return (
    <label className={clsx(base, 'relative cursor-pointer transition hover:brightness-95')}>
      <span className={clsx('size-1.5 rounded-full', ETAPA_STATUS_DOT[value])} />
      <select value={value} onChange={(e) => onChange(e.target.value as EtapaStatus)} aria-label="Status da etapa"
        onClick={(e) => e.stopPropagation()}
        className="cursor-pointer appearance-none border-0 bg-transparent py-0 pr-4 text-xs font-medium outline-none">
        {ETAPA_STATUS_ORDER.map((s) => <option key={s} value={s} className="text-slate-900">{ETAPA_STATUS_LABEL[s]}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2 text-[8px] opacity-60">▼</span>
    </label>
  )
}
