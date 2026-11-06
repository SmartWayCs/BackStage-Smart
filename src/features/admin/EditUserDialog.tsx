import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { adminUsers, toUsername } from './api'
import { ROLES } from './roles'
import type { Profile, UserRole } from '@/types/database.types'

export function EditUserDialog({ user, isSelf, onClose }: { user: Profile; isSelf: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [nome, setNome] = useState(user.nome)
  const [email, setEmail] = useState(user.email)
  const [username, setUsername] = useState(user.username)
  const [role, setRole] = useState<UserRole>(user.role)

  const save = useMutation({
    mutationFn: () => adminUsers('update', { id: user.id, nome: nome.trim(), email: email.trim(), username, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles'] }); onClose() },
  })

  function submit(e: FormEvent) { e.preventDefault(); save.mutate() }
  const label = 'block space-y-1 text-sm'
  const changedEmail = email.trim().toLowerCase() !== user.email.toLowerCase()

  return (
    <Dialog title={`Editar ${user.nome}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className={label}><span>Nome *</span>
          <input className="input" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className={label}><span>E-mail *</span>
          <input className="input" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {changedEmail && <p className="text-xs text-amber-700 dark:text-amber-300">O novo e-mail passa a valer no próximo login dessa pessoa.</p>}
        <label className={label}><span>Usuário * (minúsculas, números, . _ -)</span>
          <input className="input font-mono" required minLength={3} maxLength={30} pattern="[a-z0-9._\-]{3,30}" autoComplete="off" value={username}
            onChange={(e) => setUsername(toUsername(e.target.value))} /></label>
        <label className={label}><span>Perfil</span>
          <select className="input" value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        {isSelf && <p className="text-xs text-slate-500">Você não pode alterar o seu próprio perfil de acesso.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={save.isPending || !nome.trim() || !email.trim() || username.length < 3}>{save.isPending ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Dialog>
  )
}
