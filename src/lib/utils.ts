const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' interpretado como data local (evita deslocamento de fuso). */
export function parseDate(s: string) { return new Date(`${s}T00:00:00`) }

export function formatDate(s?: string | null) {
  return s ? parseDate(s).toLocaleDateString('pt-BR') : '—'
}

export function isOverdue(prazo: string | null | undefined, concluido: boolean) {
  return Boolean(prazo) && !concluido && (prazo as string) < todayISO()
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

export function initials(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export function parseTags(s: string) {
  return [...new Set(s.split(',').map((t) => t.trim()).filter(Boolean))]
}
