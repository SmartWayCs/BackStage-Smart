import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, KeyRound, Mail, Pencil, Plus, Search, ShieldCheck, Users, Wrench } from 'lucide-react'
import clsx from 'clsx'
import { Avatar } from '@/components/ui/Avatar'
import { StatTile } from '@/components/ui/StatTile'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { EditUserDialog } from './EditUserDialog'
import { NewUserDialog } from './NewUserDialog'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import type { Profile, UserRole } from '@/types/database.types'

type Modal = { kind: 'new' } | { kind: 'edit'; user: Profile } | { kind: 'reset'; user: Profile } | null

const ROLE_META: Record<UserRole, { label: string; icon: typeof Eye; cls: string }> = {
  admin: { label: 'Admin', icon: ShieldCheck, cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300' },
  ti: { label: 'TI', icon: Wrench, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' },
  supervisao: { label: 'Supervisão', icon: Eye, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
}

export function UsersPage() {
  const { profile: me } = useAuth()
  const [modal, setModal] = useState<Modal>(null)
  const [q, setQ] = useState('')
  const [role, setRole] = useState<UserRole | 'todos'>('todos')

  const users = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('nome')
      if (error) throw error
      return data
    },
  })

  const all = users.data ?? []
  const count = (r: UserRole) => all.filter((u) => u.role === r).length

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.filter((u) =>
      (role === 'todos' || u.role === role) &&
      (!term || [u.nome, u.username, u.email].some((v) => v.toLowerCase().includes(term))))
  }, [all, q, role])

  const tabs: { value: UserRole | 'todos'; label: string; n: number }[] = [
    { value: 'todos', label: 'Todos', n: all.length },
    { value: 'admin', label: 'Admin', n: count('admin') },
    { value: 'ti', label: 'TI', n: count('ti') },
    { value: 'supervisao', label: 'Supervisão', n: count('supervisao') },
  ]

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Administração</p>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">Crie, edite e redefina a senha de quem acessa o app. Quem recebe uma senha nova precisa trocá-la no próximo acesso.</p>
        </div>
        <button className="btn-primary rounded-xl px-4 py-2.5" onClick={() => setModal({ kind: 'new' })}><Plus size={16} />Novo usuário</button>
      </header>

      {all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Users} label="Usuários" value={all.length} delay={0} />
          <StatTile icon={ShieldCheck} label="Admins" value={count('admin')} tone="violet" delay={60} />
          <StatTile icon={Wrench} label="TI" value={count('ti')} delay={120} />
          <StatTile icon={Eye} label="Supervisão" value={count('supervisao')} tone="green" delay={180} />
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 rounded-lg pl-9" placeholder="Buscar por nome, usuário ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por perfil">
          {tabs.map((t) => (
            <button key={t.value} onClick={() => setRole(t.value)} aria-pressed={role === t.value}
              className={clsx('btn rounded-lg px-3 py-1.5', role === t.value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              {t.label}<span className={clsx('rounded-full px-1.5 text-xs tabular-nums', role === t.value ? 'bg-white/20 dark:bg-black/10' : 'bg-slate-100 dark:bg-slate-800')}>{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      {users.isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-44" />)}</div>}
      {users.error && <p className="text-sm text-red-600">Erro ao carregar usuários.</p>}

      {users.data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((u, i) => {
            const meta = ROLE_META[u.role]
            const RoleIcon = meta.icon
            return (
              <article key={u.id} className="card card-hover animate-fade-up flex flex-col gap-4 p-5" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                <div className="flex items-start gap-3">
                  <Avatar nome={u.nome} src={u.avatar_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight">
                      {u.nome}{u.id === me?.id && <span className="ml-2 text-xs font-normal text-slate-400">(você)</span>}
                    </h3>
                    <p className="truncate font-mono text-xs text-slate-500">@{u.username}</p>
                  </div>
                  <span className={clsx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', meta.cls)}><RoleIcon size={12} />{meta.label}</span>
                </div>

                <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Mail size={14} className="shrink-0 text-slate-400" /><span className="truncate">{u.email}</span></p>

                {u.must_change_password && (
                  <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <KeyRound size={12} />Aguardando troca de senha
                  </p>
                )}

                <div className="mt-auto flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button className="btn-ghost flex-1 rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => setModal({ kind: 'edit', user: u })}><Pencil size={14} />Editar</button>
                  <button className="btn-ghost flex-1 rounded-lg border border-slate-200 dark:border-slate-700" onClick={() => setModal({ kind: 'reset', user: u })}><KeyRound size={14} />Redefinir senha</button>
                </div>
              </article>
            )
          })}

          {!q && role === 'todos' && (
            <button onClick={() => setModal({ kind: 'new' })}
              className="group grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition duration-300 hover:-translate-y-1 hover:border-brand hover:bg-brand/5 hover:text-brand dark:border-slate-700">
              <span className="grid place-items-center gap-2">
                <span className="grid size-11 place-items-center rounded-full bg-slate-100 transition group-hover:scale-110 group-hover:bg-brand/10 dark:bg-slate-800"><Plus size={20} /></span>
                <span className="text-sm font-medium">Novo usuário</span>
              </span>
            </button>
          )}
          {!filtered.length && <p className="col-span-full p-6 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>}
        </div>
      )}

      {modal?.kind === 'new' && <NewUserDialog onClose={() => setModal(null)} />}
      {modal?.kind === 'edit' && <EditUserDialog user={modal.user} isSelf={modal.user.id === me?.id} onClose={() => setModal(null)} />}
      {modal?.kind === 'reset' && <ResetPasswordDialog user={modal.user} onClose={() => setModal(null)} />}
    </section>
  )
}
