import { useState, type FormEvent } from 'react'
import { ArrowRightCircle, Lightbulb, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { useIdeaMutations, useIdeas } from './api'

export function Ideas({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const { canEdit } = usePermissions()
  const { data, isLoading } = useIdeas(projectId)
  const { create, convert, remove } = useIdeaMutations(projectId, profile?.id)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')

  function add(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    create.mutate({ titulo: titulo.trim(), descricao: descricao.trim() || null },
      { onSuccess: () => { setTitulo(''); setDescricao('') } })
  }

  return (
    <section className="card p-4" aria-label="Ideias">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb size={16} />Ideias e melhorias</h2>
      {canEdit && (
        <form onSubmit={add} className="mb-3 space-y-1.5">
          <input className="input" placeholder="Nova ideia…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          {titulo && <textarea className="input" rows={2} placeholder="Detalhes (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
          {titulo && <button className="btn-primary" disabled={create.isPending}>Adicionar ideia</button>}
        </form>
      )}
      {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      {data && !data.length && <p className="text-sm text-slate-500">Nenhuma ideia registrada.</p>}
      <ul className="space-y-2">
        {data?.map((i) => (
          <li key={i.id} className="item-hover rounded-md border border-slate-200 p-2.5 text-sm dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{i.titulo}</p>
                {i.descricao && <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{i.descricao}</p>}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  {i.convertida_em_stage_id
                    ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-200">Convertida</span>
                    : <button className="btn-ghost px-2 py-1 text-xs" disabled={convert.isPending} onClick={() => convert.mutate(i.id)}>
                        <ArrowRightCircle size={14} />Virar etapa</button>}
                  <button className="btn-ghost px-2 py-1 text-slate-400 hover:text-red-600" aria-label="Excluir ideia" onClick={() => remove.mutate(i.id)}><Trash2 size={14} /></button>
                </div>
              )}
              {!canEdit && i.convertida_em_stage_id && <span className="text-xs text-green-700 dark:text-green-300">Convertida</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
