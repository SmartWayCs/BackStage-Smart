import type { Priority, ProjectStatus, TaskStatus } from '@/types/database.types'

export const STATUS_ORDER: ProjectStatus[] = ['ideia', 'planejamento', 'em_andamento', 'em_pausa', 'concluido']
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  ideia: 'Ideia', planejamento: 'Planejamento', em_andamento: 'Em andamento',
  em_pausa: 'Em pausa', concluido: 'Concluído',
}
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  ideia: '#94a3b8', planejamento: '#8b5cf6', em_andamento: '#2563eb',
  em_pausa: '#f59e0b', concluido: '#16a34a',
}

export const PRIORITY_ORDER: Priority[] = ['baixa', 'media', 'alta', 'urgente']
export const PRIORITY_LABEL: Record<Priority, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
}
export const PRIORITY_CLASS: Record<Priority, string> = {
  baixa: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  urgente: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}
export const PRIORITY_COLOR: Record<Priority, string> = {
  baixa: '#94a3b8', media: '#2563eb', alta: '#f97316', urgente: '#dc2626',
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['a_fazer', 'fazendo', 'feito']
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  a_fazer: 'A fazer', fazendo: 'Fazendo', feito: 'Feito',
}
