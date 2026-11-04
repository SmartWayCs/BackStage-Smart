import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import type { UserRole } from '@/types/database.types'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'ti', label: 'TI (editor)' },
  { value: 'supervisao', label: 'Supervisão (leitura)' },
  { value: 'admin', label: 'Admin' },
]

export function UsersPage() {
  const qc = useQueryClient()
  const { profile: me } = useAuth()

  const users = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('nome')
      if (error) throw error
      return data
    },
  })

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  })

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">Usuários e perfis</h1>
      <p className="text-sm text-slate-500">
        Crie usuários em Supabase → Authentication → Users. Eles aparecem aqui como “Supervisão” e você ajusta o perfil.
      </p>
      {users.isLoading && <p className="text-sm">Carregando…</p>}
      {users.error && <p className="text-sm text-red-600">Erro ao carregar usuários.</p>}
      {setRole.error && <p className="text-sm text-red-600">{(setRole.error as Error).message}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
            <tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Perfil</th></tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="p-3">{u.nome}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <select className="input max-w-48" value={u.role}
                    disabled={u.id === me?.id || setRole.isPending}
                    onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as UserRole })}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
