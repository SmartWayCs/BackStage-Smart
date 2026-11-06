const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' interpretado como data local (evita deslocamento de fuso). */
export function parseDate(s: string) { return new Date(`${s}T00:00:00`) }

/** Data de hoje + n dias, em 'YYYY-MM-DD'. */
export function addDaysISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDate(s?: string | null) {
  return s ? parseDate(s).toLocaleDateString('pt-BR') : '—'
}

export function isOverdue(prazo: string | null | undefined, concluido: boolean) {
  return Boolean(prazo) && !concluido && (prazo as string) < todayISO()
}

/** Projeto concluído = tem tarefas e todas estão em etapas de conclusão. */
export function isProjectDone(p: { etapas_total: number; etapas_feitas: number; modo?: string }) {
  return p.modo !== 'manutencao' && p.etapas_total > 0 && p.etapas_feitas === p.etapas_total
}

/** Projeto em manutenção não tem prazo final: nunca conta como atrasado. */
export function projectOverdue(p: { prazo: string | null; etapas_total: number; etapas_feitas: number; modo: string }) {
  return p.modo !== 'manutencao' && isOverdue(p.prazo, isProjectDone(p))
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `há ${Math.floor(diff / 86400)} d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Posição entre dois vizinhos (ordenação fracionária, sem reindexar a coluna). */
export function positionBetween(prev?: number, next?: number) {
  if (prev === undefined && next === undefined) return 1000
  if (prev === undefined) return (next as number) - 1000
  if (next === undefined) return prev + 1000
  return (prev + next) / 2
}

/** 12 -> "12 h"; 12.5 -> "12,5 h"; vazio -> "—". */
export function formatHours(h: number | null | undefined) {
  if (h === null || h === undefined) return '—'
  const v = Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',')
  return `${v} h`
}

/** Campo de horas: aceita "12", "12,5" ou "12.5"; vazio ou inválido vira null. */
export function parseHours(s: string) {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export const isImageName = (nome: string) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(nome)

export function initials(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export function parseTags(s: string) {
  return [...new Set(s.split(',').map((t) => t.trim()).filter(Boolean))]
}
