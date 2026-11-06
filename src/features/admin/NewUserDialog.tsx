import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { adminUsers, generatePassword, toUsername } from './api'
import { CredentialsDialog } from './CredentialsDialog'
import { PasswordInput } from './PasswordInput'
import { ROLES } from './roles'
import type { UserRole } from '@/types/database.types'

interface Input { nome: string; username: string; email: string; senha: string; role: UserRole }

export function NewUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [senha, setSenha] = useState(generatePassword)
  const [role, setRole] = useState<UserRole>('supervisao')
  const [created, setCreated] = useState<Input | null>(null)

  const create = useMutation({
    mutationFn: (input: Input) => adminUsers('create', { ...input }),
    onSuccess: (_d, input) => { setCreated(input); qc.invalidateQueries({ queryKey: ['profiles'] }) },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate({ nome: nome.trim(), username, email: email.trim(), senha, role })
  }

  if (created) {
    return (
      <CredentialsDialog title="Usuário criado" onClose={onClose}
        intro={<><strong>{created.nome}</strong> já pode entrar no app. Passe estes dados a essa pessoa.</>}
        text={`Usuário: ${created.username}\nE-mail: ${created.email}\nSenha: ${created.senha}`} />
    )
  }

  const label = 'block space-y-1 text-sm'
  return (
    <Dialog title="Novo usuário" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className={label}><span>Nome *</span>
          <input className="input" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className={label}><span>E-mail *</span>
          <input className="input" type="email" required autoComplete="off" value={email}
            onChange={(e) => { setEmail(e.target.value); if (!usernameTouched) setUsername(toUsername(e.target.value.split('@')[0] ?? '')) }} /></label>
        <label className={label}><span>Usuário * (minúsculas, números, . _ -)</span>
          <input className="input font-mono" required minLength={3} maxLength={30} pattern="[a-z0-9._\-]{3,30}" autoComplete="off" value={username}
            onChange={(e) => { setUsernameTouched(true); setUsername(toUsername(e.target.value)) }} /></label>
        <label className={label}><span>Senha provisória * (mínimo 8 caracteres)</span>
          <PasswordInput value={senha} onChange={setSenha} /></label>
        <label className={label}><span>Perfil</span>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        <p className="text-xs text-slate-500">No primeiro acesso a pessoa será obrigada a trocar essa senha.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={create.isPending || !nome.trim() || !email.trim() || username.length < 3 || senha.length < 8}>
            {create.isPending ? 'Criando…' : 'Criar usuário'}</button>
        </div>
      </form>
    </Dialog>
  )
}
