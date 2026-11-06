import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Eye, EyeOff, Loader2, LogOut, ShieldAlert } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

const RULES = [
  { label: 'Pelo menos 8 caracteres', test: (s: string) => s.length >= 8 },
  { label: 'Uma letra e um número', test: (s: string) => /[A-Za-z]/.test(s) && /\d/.test(s) },
]

function friendly(message: string) {
  if (/different from the old/i.test(message)) return 'A nova senha precisa ser diferente da senha atual.'
  if (/weak|easy to guess|pwned/i.test(message)) return 'Essa senha é fraca ou muito comum. Escolha outra.'
  return message
}

export function ChangePasswordPage() {
  const { session, profile, loading, signOut, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading || (session && !profile)) return <div className="grid min-h-screen place-items-center text-sm text-white/70">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />

  const forced = Boolean(profile?.must_change_password)
  const okRules = RULES.map((r) => r.test(senha))
  const match = senha.length > 0 && senha === confirma
  const valid = okRules.every(Boolean) && match

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password: senha })
    if (updateError) { setBusy(false); setError(friendly(updateError.message)); return }
    const { error: flagError } = await supabase.rpc('complete_password_change')
    if (flagError) { setBusy(false); setError(flagError.message); return }
    await reloadProfile()
    setBusy(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 size-80 animate-blob rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-80 animate-blob rounded-full bg-accent/15 blur-3xl [animation-delay:-9s]" />

      <form onSubmit={onSubmit} className="card relative w-full max-w-md animate-fade-up space-y-5 p-7 shadow-xl shadow-brand/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" width={48} height={48} className="drop-shadow-lg" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{forced ? 'Crie sua senha' : 'Alterar senha'}</h1>
            <p className="text-sm text-slate-500">{profile?.nome}</p>
          </div>
        </div>

        {forced && (
          <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            Este é o seu primeiro acesso (ou sua senha foi redefinida). Escolha uma senha pessoal para continuar.
          </p>
        )}

        <label className="block space-y-1.5 text-sm font-medium"><span>Nova senha</span>
          <span className="relative block">
            <input className="input h-11 pr-11" type={show ? 'text' : 'password'} required autoFocus autoComplete="new-password"
              value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <label className="block space-y-1.5 text-sm font-medium"><span>Confirmar nova senha</span>
          <input className="input h-11" type={show ? 'text' : 'password'} required autoComplete="new-password"
            value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        </label>

        <ul className="space-y-1 text-sm">
          {RULES.map((r, i) => (
            <li key={r.label} className={clsx('flex items-center gap-2 transition-colors', okRules[i] ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
              <Check size={14} className={clsx('transition-opacity', okRules[i] ? 'opacity-100' : 'opacity-30')} />{r.label}
            </li>
          ))}
          <li className={clsx('flex items-center gap-2 transition-colors', match ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
            <Check size={14} className={clsx('transition-opacity', match ? 'opacity-100' : 'opacity-30')} />As duas senhas são iguais
          </li>
        </ul>

        {error && <p role="alert" className="animate-fade-in rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        <button disabled={!valid || busy} className="btn-primary h-11 w-full">
          {busy ? <><Loader2 size={18} className="animate-spin" />Salvando…</> : forced ? 'Salvar e entrar' : 'Salvar nova senha'}
        </button>

        <div className="flex justify-between text-sm">
          {forced
            ? <span />
            : <Link to="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><ArrowLeft size={14} />Voltar</Link>}
          <button type="button" onClick={signOut} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"><LogOut size={14} />Sair</button>
        </div>
      </form>
    </div>
  )
}
