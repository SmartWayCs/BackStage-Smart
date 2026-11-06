import type { EtapaStatus, PedidoStatus, Priority, RiscoNivel } from '@/types/database.types'

export const PRIORITY_ORDER: Priority[] = ['neutra', 'baixa', 'media', 'alta', 'urgente']
export const PRIORITY_LABEL: Record<Priority, string> = {
  neutra: 'Neutra', baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
}
export const PRIORITY_CLASS: Record<Priority, string> = {
  neutra: 'bg-white text-slate-500 ring-1 ring-inset ring-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-600',
  baixa: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  urgente: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}
export const PRIORITY_COLOR: Record<Priority, string> = {
  neutra: '#cbd5e1', baixa: '#94a3b8', media: '#2563eb', alta: '#f97316', urgente: '#dc2626',
}

/** Tags de status de cada etapa. */
export const ETAPA_STATUS_ORDER: EtapaStatus[] = ['ideia', 'planejamento', 'em_andamento', 'em_pausa', 'concluido']
export const ETAPA_STATUS_LABEL: Record<EtapaStatus, string> = {
  ideia: 'Ideia', planejamento: 'Planejamento', em_andamento: 'Em andamento', em_pausa: 'Em pausa', concluido: 'Concluído',
}
/** Cores da tag (fundo + texto) e do pontinho. */
export const ETAPA_STATUS_CLASS: Record<EtapaStatus, string> = {
  ideia: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  planejamento: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  em_pausa: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  concluido: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
}
export const ETAPA_STATUS_DOT: Record<EtapaStatus, string> = {
  ideia: 'bg-slate-400', planejamento: 'bg-violet-500', em_andamento: 'bg-brand', em_pausa: 'bg-amber-500', concluido: 'bg-emerald-500',
}

/** Risco da etapa. */
export const RISCO_ORDER: RiscoNivel[] = ['baixo', 'medio', 'alto']
export const RISCO_LABEL: Record<RiscoNivel, string> = { baixo: 'Risco baixo', medio: 'Risco médio', alto: 'Risco alto' }
export const RISCO_CLASS: Record<RiscoNivel, string> = {
  baixo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medio: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  alto: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
}
/** Cores (hex) de cada status, para o cronograma. */
export const ETAPA_STATUS_HEX: Record<EtapaStatus, string> = {
  ideia: '#94a3b8', planejamento: '#8b5cf6', em_andamento: '#2563eb', em_pausa: '#f59e0b', concluido: '#10b981',
}

/** Situação de um pedido feito à TI. */
export const PEDIDO_STATUS_ORDER: PedidoStatus[] = ['novo', 'em_analise', 'aprovado', 'convertido', 'recusado']
export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  novo: 'Novo', em_analise: 'Em análise', aprovado: 'Aprovado', recusado: 'Recusado', convertido: 'Virou projeto',
}
export const PEDIDO_STATUS_CLASS: Record<PedidoStatus, string> = {
  novo: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  em_analise: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  aprovado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  recusado: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  convertido: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
}
