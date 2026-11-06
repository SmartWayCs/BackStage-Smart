import { useMemo, useState, type FormEvent } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProfiles } from '@/features/projects/api'
import { useProfileMap } from '@/hooks/useProfileMap'
import { timeAgo } from '@/lib/utils'
import { useCommentMutations, useComments } from './api'
import type { Profile } from '@/types/database.types'

/** Textarea com sugestão de @usuário. */
function MentionInput({ value, onChange, users }: { value: string; onChange: (v: string) => void; users: Profile[] }) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(value)
  const options = useMemo(() => {
    if (!match) return []
    const q = match[1]!.toLowerCase()
    return users.filter((u) => u.nome.toLowerCase().includes(q)).slice(0, 5)
  }, [match, users])

  function pick(u: Profile) {
    onChange(value.replace(/@([^\s@]*)$/, `@${u.nome} `))
  }

  return (
    <div className="relative">
      <textarea className="input" rows={3} placeholder="Escreva um comentário… use @ para mencionar" value={value}
        onChange={(e) => onChange(e.target.value)} />
      {options.length > 0 && (
        <ul className="card absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden shadow-lg" role="listbox">
          {options.map((u) => (
            <li key={u.id}>
              <button type="button" role="option" aria-selected="false" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onMouseDown={(e) => { e.preventDefault(); pick(u) }}>
                <Avatar nome={u.nome} src={u.avatar_url} size={20} />{u.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Content({ text, users }: { text: string; users: Profile[] }) {
  // Destaca "@Nome Completo" de usuários existentes (nomes mais longos primeiro).
  const names = users.map((u) => u.nome).sort((a, b) => b.length - a.length)
  if (!names.length) return <>{text}</>
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'))
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-blue-100 px-0.5 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100">{p}</mark> : p))}</>
}

export function Comments({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const profilesQ = useProfiles()
  const profileMap = useProfileMap()
  const { data, isLoading } = useComments(projectId)
  const { create, remove } = useCommentMutations(projectId, profile?.id)
  const [text, setText] = useState('')
  const users = profilesQ.data ?? []

  function submit(e: FormEvent) {
    e.preventDefault()
    const conteudo = text.trim()
    if (!conteudo) return
    const mencoes = users.filter((u) => conteudo.includes(`@${u.nome}`)).map((u) => u.id)
    create.mutate({ conteudo, mencoes }, { onSuccess: () => setText('') })
  }

  return (
    <section className="card p-4" aria-label="Comentários">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><MessageSquare size={16} />Comentários</h2>
      {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      <ul className="mb-3 space-y-3">
        {data?.map((c) => {
          const author = profileMap.get(c.autor_id)
          const mine = c.autor_id === profile?.id
          return (
            <li key={c.id} className="row-hover -mx-2 flex gap-2 rounded-md p-2 text-sm">
              <Avatar nome={author?.nome ?? '?'} src={author?.avatar_url} size={28} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <strong>{author?.nome ?? 'Usuário'}</strong>
                  <span className="text-xs text-slate-500">{timeAgo(c.created_at)}</span>
                  {(mine || profile?.role === 'admin') && (
                    <button className="ml-auto text-slate-400 hover:text-red-600" aria-label="Excluir comentário" onClick={() => remove.mutate(c.id)}><Trash2 size={13} /></button>
                  )}
                </p>
                <p className="whitespace-pre-wrap break-words"><Content text={c.conteudo} users={users} /></p>
              </div>
            </li>
          )
        })}
        {data && !data.length && <li className="text-sm text-slate-500">Sem comentários.</li>}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        <MentionInput value={text} onChange={setText} users={users.filter((u) => u.id !== profile?.id)} />
        <button className="btn-primary" disabled={!text.trim() || create.isPending}>Comentar</button>
      </form>
    </section>
  )
}
