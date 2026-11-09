import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, CheckCircle2, FolderKanban, Inbox, Pencil, Plus, Search, Trash2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { StatTile } from '@/components/ui/StatTile'
import { PEDIDO_STATUS_CLASS, PEDIDO_STATUS_LABEL, PEDIDO_STATUS_ORDER, PRIORITY_LABEL } from '@/lib/constants'
import { formatDate, isOverdue, nowHM, timeAgo, todayISO } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRequestMutations, useRequests } from './api'
import type { PedidoRow, PedidoStatus, PedidoUrgencia } from '@/types/database.types'

const URGENCIAS: PedidoUrgencia[] = ['baixa', 'media', 'alta', 'urgente']

/** Janela de novo pedido (ou de edição, enquanto ele ainda está "Novo"). */
function RequestDialog({ pedido, onClose }: { pedido?: PedidoRow; onClose: () => void }) {
  const { profile } = useAuth()
  const { create, update } = useRequestMutations(profile?.id)
  const [titulo, setTitulo] = useState(pedido?.titulo ?? '')
  const [setor, setSetor] = useState(pedido?.setor ?? '')
  const [urgencia, setUrgencia] = useState<PedidoUrgencia | ''>(pedido?.urgencia ?? '') // sem padrão: a escolha é de quem abre
  const [descricao, setDescricao] = useState(pedido?.descricao ?? '')
  const busy = create.isPending || update.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!urgencia) return
    const v = { titulo: titulo.trim(), setor: setor.trim() || null, urgencia, descricao: descricao.trim() || null }
    if (pedido) update.mutate({ id: pedido.id, patch: v }, { onSuccess: onClose })
    else create.mutate(v, { onSuccess: onClose })
  }
  const label = 'block space-y-1 text-sm'
  return (
    <Dialog title={pedido ? 'Editar pedido' : 'Novo pedido à TI'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className={label}><span>O que você precisa? *</span>
          <input className="input" required autoFocus maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Relatório de produção em tempo real" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}><span>Setor</span>
            <input className="input" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex.: Comercial" /></label>
          <label className={label}><span>Urgência *</span>
            <select className="input" required value={urgencia} onChange={(e) => setUrgencia(e.target.value as PedidoUrgencia)}>
              <option value="" disabled>Selecione</option>
              {URGENCIAS.map((u) => <option key={u} value={u}>{PRIORITY_LABEL[u]}</option>)}</select></label>
        </div>
        <label className={label}><span>Motivo e detalhes</span>
          <textarea className="input" rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Qual é o problema ou a necessidade? Quem é afetado? O que mudaria se isso fosse resolvido?" /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy || !titulo.trim() || !urgencia}>{busy ? 'Enviando…' : pedido ? 'Salvar' : 'Enviar pedido'}</button>
        </div>
      </form>
    </Dialog>
  )
}

/** Aprovar com prazo, rever o prazo ou recusar, com uma resposta para quem pediu. */
function DecisionDialog({ pedido, decisao, onClose }: { pedido: PedidoRow; decisao: 'aprovado' | 'recusado'; onClose: () => void }) {
  const { profile } = useAuth()
  const { update } = useRequestMutations(profile?.id)
  const [resposta, setResposta] = useState(pedido.resposta ?? '')
  const [prazo, setPrazo] = useState(pedido.prazo ?? '')
  const [hora, setHora] = useState(pedido.prazo_hora?.slice(0, 5) ?? '')
  const recusar = decisao === 'recusado'
  const aprovado = pedido.status === 'aprovado'
  function submit(e: FormEvent) {
    e.preventDefault()
    update.mutate({ id: pedido.id, patch: { status: decisao, resposta: resposta.trim() || null, prazo: recusar ? null : prazo, prazo_hora: recusar ? null : hora || null } }, { onSuccess: onClose })
  }
  return (
    <Dialog title={recusar ? 'Recusar pedido' : aprovado ? 'Prazo do pedido' : 'Aprovar pedido'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm"><strong>{pedido.titulo}</strong></p>
        {!recusar && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm"><span>Prazo para resolver *</span>
              <input className="input" type="date" required autoFocus min={todayISO()} value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span>Horário (opcional)</span>
              <input className="input" type="time" min={prazo === todayISO() ? nowHM() : undefined} value={hora} onChange={(e) => setHora(e.target.value)} /></label>
          </div>
        )}
        <label className="block space-y-1 text-sm"><span>{recusar ? 'Motivo da recusa *' : 'Resposta para quem pediu (opcional)'}</span>
          <textarea className="input" rows={4} autoFocus={recusar} required={recusar} value={resposta} onChange={(e) => setResposta(e.target.value)}
            placeholder={recusar ? 'Explique por que não será feito agora.' : 'Ex.: Entra no próximo trimestre.'} /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className={clsx('btn', recusar ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary')} disabled={update.isPending || (recusar ? !resposta.trim() : !prazo)}>
            {recusar ? 'Recusar pedido' : aprovado ? 'Salvar' : 'Aprovar pedido'}</button>
        </div>
      </form>
    </Dialog>
  )
}

/** Fila de pedidos: o admin abre; a TI analisa, define o prazo ao aprovar, recusa ou transforma em projeto. */
export function RequestsPage() {
  const { profile } = useAuth()
  const { canEdit, isAdmin } = usePermissions()
  const navigate = useNavigate()
  const profiles = useProfileMap()
  const q = useRequests()
  const { update, remove, toProject } = useRequestMutations(profile?.id)
  const [filter, setFilter] = useState<PedidoStatus | 'todos'>('todos')
  const [mine, setMine] = useState(false)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ kind: 'new' } | { kind: 'edit'; p: PedidoRow } | { kind: 'decide'; p: PedidoRow; d: 'aprovado' | 'recusado' } | null>(null)

  const all = q.data ?? []
  const base = useMemo(() => all.filter((p) => (!mine || p.solicitante_id === profile?.id) && (!search.trim() || `${p.titulo} ${p.setor ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))), [all, mine, search, profile?.id])
  const count = (s: PedidoStatus) => base.filter((p) => p.status === s).length
  const list = filter === 'todos' ? base : base.filter((p) => p.status === filter)

  async function convert(p: PedidoRow) {
    if (!window.confirm(`Transformar “${p.titulo}” em projeto?`)) return
    toProject.mutate(p.id, { onSuccess: (id) => navigate(`/projetos/${id}`) })
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Fila de pedidos</p>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos à TI</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">O admin abre o pedido com a urgência. A TI analisa, define o prazo ao aprovar, recusa ou transforma o pedido em projeto, e tudo fica registrado.</p>
        </div>
        {isAdmin && <button className="btn-primary rounded-xl px-4 py-2.5" onClick={() => setDialog({ kind: 'new' })}><Plus size={16} />Novo pedido</button>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Inbox} label="Novos" value={count('novo')} delay={0} />
        <StatTile icon={Search} label="Em análise" value={count('em_analise')} tone="violet" delay={60} />
        <StatTile icon={CheckCircle2} label="Aprovados" value={count('aprovado')} tone="green" delay={120} />
        <StatTile icon={FolderKanban} label="Viraram projeto" value={count('convertido')} delay={180} />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 rounded-lg pl-9" placeholder="Buscar pedido ou setor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por situação">
          {([['todos', 'Todos', base.length], ...PEDIDO_STATUS_ORDER.map((s) => [s, PEDIDO_STATUS_LABEL[s], count(s)] as const)] as const).map(([v, l, n]) => (
            <button key={v} onClick={() => setFilter(v as PedidoStatus | 'todos')} aria-pressed={filter === v}
              className={clsx('btn rounded-lg px-3 py-1.5', filter === v ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              {l}<span className="text-xs tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Só os meus</label>
      </div>

      {q.isLoading && <div className="grid gap-4 lg:grid-cols-2"><div className="skeleton h-44" /><div className="skeleton h-44" /></div>}
      {q.error && <p className="text-sm text-red-600">Erro ao carregar os pedidos: {(q.error as Error).message}</p>}
      {q.data && !list.length && (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <Inbox size={28} className="text-slate-400" />
          <p className="font-semibold">{all.length ? 'Nenhum pedido com esses filtros' : 'Nenhum pedido ainda'}</p>
          <p className="max-w-sm text-sm text-slate-500">{all.length ? 'Tente limpar a busca ou trocar a situação.' : 'Os pedidos abertos pelo admin aparecem aqui.'}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((p, i) => {
          const owner = p.solicitante_id ? profiles.get(p.solicitante_id)?.nome : undefined
          const decider = p.decidido_por ? profiles.get(p.decidido_por)?.nome : undefined
          const own = p.solicitante_id === profile?.id && p.status === 'novo'
          const atrasado = isOverdue(p.prazo, p.status !== 'aprovado', p.prazo_hora)
          return (
            <article key={p.id} className="card animate-fade-up flex flex-col gap-3 p-5" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', PEDIDO_STATUS_CLASS[p.status])}>{PEDIDO_STATUS_LABEL[p.status]}</span>
                <PriorityBadge value={p.urgencia} />
                {p.setor && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{p.setor}</span>}
                <span className="ml-auto text-xs text-slate-500">{timeAgo(p.created_at)}</span>
              </div>
              <h3 className="text-lg font-semibold leading-snug tracking-tight">{p.titulo}</h3>
              {p.descricao && <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{p.descricao}</p>}
              <p className="text-xs text-slate-500">Pedido por <strong>{owner ?? 'alguém'}</strong></p>
              {p.prazo && (
                <p className={clsx('inline-flex w-fit items-center gap-1.5 text-sm font-medium', atrasado && 'text-red-600 dark:text-red-400')}>
                  <CalendarClock size={14} />Prazo: {formatDate(p.prazo)}{p.prazo_hora && ` às ${p.prazo_hora.slice(0, 5)}`}{atrasado && ' (vencido)'}
                </p>
              )}

              {p.resposta && (
                <p className={clsx('rounded-lg p-3 text-sm', p.status === 'recusado' ? 'bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200' : 'bg-slate-50 dark:bg-slate-800/60')}>
                  <strong>Resposta da TI{decider ? ` (${decider})` : ''}:</strong> {p.resposta}
                </p>
              )}
              {p.project_id && <Link to={`/projetos/${p.project_id}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline"><FolderKanban size={14} />Abrir o projeto criado</Link>}

              {(canEdit || own) && (
                <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {canEdit && p.status === 'novo' && <button className="btn-ghost rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => update.mutate({ id: p.id, patch: { status: 'em_analise' } })}><Search size={14} />Analisar</button>}
                  {canEdit && (p.status === 'novo' || p.status === 'em_analise') && <button className="btn-ghost rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => setDialog({ kind: 'decide', p, d: 'aprovado' })}><CheckCircle2 size={14} />Aprovar</button>}
                  {canEdit && (p.status === 'novo' || p.status === 'em_analise') && <button className="btn-ghost rounded-lg border border-red-200 text-red-700 dark:border-red-900 dark:text-red-400" onClick={() => setDialog({ kind: 'decide', p, d: 'recusado' })}><XCircle size={14} />Recusar</button>}
                  {canEdit && p.status === 'aprovado' && <button className="btn-ghost rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => setDialog({ kind: 'decide', p, d: 'aprovado' })}><CalendarClock size={14} />{p.prazo ? 'Alterar prazo' : 'Definir prazo'}</button>}
                  {canEdit && p.status === 'aprovado' && p.prazo && <button className="btn-primary rounded-lg" disabled={toProject.isPending} onClick={() => convert(p)}><FolderKanban size={14} />Virar projeto</button>}
                  {canEdit && p.status === 'recusado' && <button className="btn-ghost rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => update.mutate({ id: p.id, patch: { status: 'em_analise' } })}>Reabrir</button>}
                  {own && <button className="btn-ghost rounded-lg" onClick={() => setDialog({ kind: 'edit', p })}><Pencil size={14} />Editar</button>}
                  {(own || canEdit) && <button className="btn-ghost ml-auto rounded-lg text-slate-400 hover:text-red-600" aria-label="Excluir pedido" onClick={() => { if (window.confirm(`Excluir o pedido “${p.titulo}”?`)) remove.mutate(p.id) }}><Trash2 size={14} /></button>}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {dialog?.kind === 'new' && <RequestDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <RequestDialog pedido={dialog.p} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'decide' && <DecisionDialog pedido={dialog.p} decisao={dialog.d} onClose={() => setDialog(null)} />}
    </section>
  )
}
