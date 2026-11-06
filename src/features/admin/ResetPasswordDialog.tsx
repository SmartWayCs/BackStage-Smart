import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { adminUsers, generatePassword } from './api'
import { CredentialsDialog } from './CredentialsDialog'
import { PasswordInput } from './PasswordInput'
import type { Profile } from '@/types/database.types'

export function ResetPasswordDialog({ user, onClose }: { user: Profile; onClose: () => void }) {
  const qc = useQueryClient()
  const [senha, setSenha] = useState(generatePassword)
  const [done, setDone] = useState<string | null>(null)

  const reset = useMutation({
    mutationFn: () => adminUsers('reset_password', { id: user.id, senha }),
    onSuccess: () => { setDone(senha); qc.invalidateQueries({ queryKey: ['profiles'] }) },
  })

  if (done) {
    return (
      <CredentialsDialog title="Senha redefinida" onClose={onClose}
        intro={<>A senha de <strong>{user.nome}</strong> foi redefinida. Passe os dados novos a essa pessoa.</>}
        text={`Usuário: ${user.username}\nE-mail: ${user.email}\nSenha: ${done}`} />
    )
  }

  function submit(e: FormEvent) { e.preventDefault(); reset.mutate() }

  return (
    <Dialog title={`Redefinir senha de ${user.nome}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1 text-sm"><span>Nova senha provisória * (mínimo 8 caracteres)</span>
          <PasswordInput value={senha} onChange={setSenha} /></label>
        <p className="text-xs text-slate-500">No próximo acesso, a pessoa será obrigada a escolher a própria senha.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={reset.isPending || senha.length < 8}>{reset.isPending ? 'Redefinindo…' : 'Redefinir senha'}</button>
        </div>
      </form>
    </Dialog>
  )
}
