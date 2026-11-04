import { History } from 'lucide-react'
import { PRIORITY_LABEL, STATUS_LABEL, TASK_STATUS_LABEL } from '@/lib/constants'
import { formatDate, formatDateTime, timeAgo } from '@/lib/utils'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useActivity } from './api'
import type { Activity, Profile } from '@/types/database.types'

type D = Record<string, string | null | undefined>
const label = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v : '—')

export function describe(a: Activity, profiles: Map<string, Profile>): string {
  const d = (a.detalhes ?? {}) as D
  const who = (id?: string | null) => (id ? profiles.get(id)?.nome ?? 'alguém' : 'ninguém')
  switch (a.acao) {
    case 'projeto_criado': return 'criou o projeto'
    case 'status_alterado': return `moveu o projeto de “${label(STATUS_LABEL, d.de)}” para “${label(STATUS_LABEL, d.para)}”`
    case 'situacao_atualizada': return d.texto ? `atualizou a situação atual: “${d.texto}”` : 'limpou a situação atual'
    case 'responsavel_alterado': return `trocou o responsável para ${who(d.para)}`
    case 'prioridade_alterada': return `mudou a prioridade para ${label(PRIORITY_LABEL, d.para)}`
    case 'prazo_alterado': return `alterou o prazo para ${d.para ? formatDate(d.para) : 'sem prazo'}`
    case 'tarefa_criada': return `criou a tarefa “${d.titulo}”`
    case 'tarefa_concluida': return `concluiu a tarefa “${d.titulo}”`
    case 'tarefa_movida': return `moveu a tarefa “${d.titulo}” para “${label(TASK_STATUS_LABEL, d.para)}”`
    case 'comentario_adicionado': return `comentou: “${d.trecho}”`
    case 'ideia_criada': return `registrou a ideia “${d.titulo}”`
    case 'ideia_convertida': return `converteu a ideia “${d.titulo}” em tarefa`
    case 'anexo_adicionado': return `anexou “${d.nome}”`
    default: return a.acao
  }
}

export function Timeline({ projectId }: { projectId: string }) {
  const { data, isLoading } = useActivity(projectId)
  const profiles = useProfileMap()
  return (
    <section className="card p-4" aria-label="Histórico">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><History size={16} />Histórico</h2>
      {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      {data && !data.length && <p className="text-sm text-slate-500">Nada registrado ainda.</p>}
      <ol className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
        {data?.map((a) => (
          <li key={a.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand" />
            <p><strong>{a.usuario_id ? profiles.get(a.usuario_id)?.nome ?? 'Alguém' : 'Sistema'}</strong> {describe(a, profiles)}</p>
            <time className="text-xs text-slate-500" dateTime={a.created_at} title={formatDateTime(a.created_at)}>{timeAgo(a.created_at)}</time>
          </li>
        ))}
      </ol>
    </section>
  )
}
