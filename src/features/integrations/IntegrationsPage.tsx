import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'

const API_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://SEU-PROJETO.supabase.co'}/functions/v1/integration-api`

/** Chave aleatória "bsk_…" e o hash dela: só o hash vai para o banco. */
async function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = 'bsk_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { token, hash, prefixo: token.slice(0, 12) }
}

function CopyBox({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) } catch { /* ignore */ } }}>
          {ok ? <><Check size={13} />Copiado</> : <><Copy size={13} />Copiar</>}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">{text}</pre>
    </div>
  )
}

const EXEMPLO_CURL = `curl -s -X POST ${API_URL} \\
  -H "x-api-key: SUA_CHAVE" -H "Content-Type: application/json" \\
  -d '{"action":"create_stage","project_nome":"Nome do projeto","nome":"Título da etapa","descricao":"O que foi feito","status":"concluido"}'`

const TRECHO_CLAUDE = `## Registro no BackStage Smart
Quando eu pedir para registrar (ou ao concluir uma tarefa deste projeto), crie uma etapa no BackStage:

curl -s -X POST ${API_URL} \\
  -H "x-api-key: $BACKSTAGE_TOKEN" -H "Content-Type: application/json" \\
  -d '{"action":"create_stage","project_nome":"NOME DO PROJETO AQUI","nome":"<título curto da tarefa>","descricao":"<o que foi feito>","status":"concluido"}'

Regras: não invente horas; deixe horas_realizadas de fora a menos que eu informe.
Se o projeto ainda não existir, crie antes com "action":"create_project".`

const ACOES: [string, string][] = [
  ['list_projects', 'Lista os projetos (id, nome, fase, progresso).'],
  ['list_stages', 'Lista as etapas de um projeto. Envie project_nome ou project_id.'],
  ['create_project', 'Cria um projeto. Campos: nome, descricao, prioridade, modo, prazo, data_inicio, horas_previstas, tags e etapas (lista).'],
  ['create_stage', 'Cria uma etapa. Campos: project_nome ou project_id, nome, descricao, notas, status, horas_previstas, horas_realizadas, data_inicio, prazo.'],
  ['update_stage', 'Atualiza uma etapa (stage_id + os campos a mudar), por exemplo status, horas_realizadas, bloqueada.'],
  ['create_request', 'Abre um pedido na fila da TI. Campos: titulo, descricao, setor, urgencia, solicitante_email.'],
]

/** Chaves para outros programas (e o Claude) criarem projetos e etapas no app. Só admin. */
export function IntegrationsPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [nome, setNome] = useState('')
  const [shown, setShown] = useState<{ nome: string; token: string } | null>(null)

  const tokens = useQuery({
    queryKey: ['api-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase.from('api_tokens').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const create = useMutation({
    mutationFn: async (n: string) => {
      const t = await newToken()
      const { error } = await supabase.from('api_tokens').insert({ nome: n, prefixo: t.prefixo, token_hash: t.hash })
      if (error) throw error
      return { nome: n, token: t.token }
    },
    onSuccess: (r) => { setCreating(false); setNome(''); setShown(r); qc.invalidateQueries({ queryKey: ['api-tokens'] }) },
  })
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('api_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('api_tokens').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  })

  function submit(e: FormEvent) { e.preventDefault(); if (nome.trim()) create.mutate(nome.trim()) }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Administração</p>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Chaves para outros programas e para o Claude criarem projetos e etapas aqui dentro. Cada integração tem a sua chave, e você pode revogá-la quando quiser.</p>
        </div>
        <button className="btn-primary rounded-xl px-4 py-2.5" onClick={() => setCreating(true)}><Plus size={16} />Nova chave</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>
            <th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">Chave</th><th className="p-3 font-medium">Criada</th><th className="p-3 font-medium">Último uso</th><th className="p-3 font-medium">Situação</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {tokens.data?.map((t) => (
              <tr key={t.id} className="row-hover border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="p-3 font-medium">{t.nome}</td>
                <td className="p-3 font-mono text-xs text-slate-500">{t.prefixo}…</td>
                <td className="p-3 text-slate-500">{timeAgo(t.created_at)}</td>
                <td className="p-3 text-slate-500">{t.last_used_at ? timeAgo(t.last_used_at) : 'nunca'}</td>
                <td className="p-3"><span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', t.revoked_at ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300')}>{t.revoked_at ? 'Revogada' : 'Ativa'}</span></td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {!t.revoked_at && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { if (window.confirm(`Revogar a chave “${t.nome}”? Quem a usa perde o acesso.`)) revoke.mutate(t.id) }}>Revogar</button>}
                    <button className="btn-ghost px-2 py-1 text-slate-400 hover:text-red-600" aria-label="Excluir chave" onClick={() => { if (window.confirm(`Excluir a chave “${t.nome}”?`)) remove.mutate(t.id) }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {tokens.isLoading && <tr><td colSpan={6} className="p-6"><div className="skeleton h-6" /></td></tr>}
            {tokens.data && !tokens.data.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500"><KeyRound className="mx-auto mb-2 text-slate-400" />Nenhuma chave ainda. Crie uma para começar.</td></tr>}
          </tbody>
        </table>
      </div>
      {tokens.error && <p className="text-sm text-red-600">Erro ao carregar. A migration das chaves já foi rodada?</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Como chamar a API</h2>
          <p className="text-sm text-slate-500">Todas as chamadas são <strong>POST</strong> para o mesmo endereço, com a chave no cabeçalho <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">x-api-key</code> e um JSON com a <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">action</code>.</p>
          <CopyBox label="Endereço" text={API_URL} />
          <CopyBox label="Exemplo" text={EXEMPLO_CURL} />
          <ul className="space-y-2 text-sm">
            {ACOES.map(([a, d]) => <li key={a}><code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">{a}</code> <span className="text-slate-600 dark:text-slate-300">{d}</span></li>)}
          </ul>
          <p className="text-xs text-slate-500">status: ideia, planejamento, em_andamento, em_pausa, concluido · prioridade: neutra, baixa, media, alta, urgente · datas: AAAA-MM-DD.</p>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Usar com o Claude</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Crie uma chave chamada “Claude”.</li>
            <li>No terminal, guarde a chave sem colocá-la no código: <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-800">export BACKSTAGE_TOKEN=&quot;bsk_…&quot;</code> (ponha no <code className="font-mono text-xs">~/.zshrc</code> para ficar permanente).</li>
            <li>No arquivo <code className="font-mono text-xs">CLAUDE.md</code> da pasta do projeto, cole o trecho abaixo.</li>
          </ol>
          <CopyBox label="Trecho para o CLAUDE.md" text={TRECHO_CLAUDE} />
          <p className="text-xs text-slate-500">Nunca cole a chave dentro do CLAUDE.md nem a envie em conversas: use sempre a variável de ambiente.</p>
        </section>
      </div>

      {creating && (
        <Dialog title="Nova chave de integração" onClose={() => setCreating(false)}>
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1 text-sm"><span>Nome da integração *</span>
              <input className="input" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Claude, GitHub, Formulário do site" /></label>
            <p className="text-xs text-slate-500">A chave será mostrada uma única vez, na próxima tela.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="btn-primary" disabled={create.isPending || !nome.trim()}>{create.isPending ? 'Criando…' : 'Criar chave'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {shown && (
        <Dialog title="Guarde esta chave agora" onClose={() => setShown(null)}>
          <div className="space-y-4 text-sm">
            <p>Esta é a chave de <strong>{shown.nome}</strong>. <strong>Ela não será mostrada de novo.</strong> Se perder, revogue e crie outra.</p>
            <CopyBox label="Chave" text={shown.token} />
            <div className="flex justify-end"><button className="btn-primary" onClick={() => setShown(null)}>Já guardei</button></div>
          </div>
        </Dialog>
      )}
    </section>
  )
}
