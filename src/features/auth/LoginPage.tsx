import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { isSupabaseConfigured } from '@/lib/supabase'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname: string } } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) setError(err === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : err)
    else navigate('/', { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold">BackStage Smart</h1>
          <p className="text-sm text-slate-500">Projetos da TI</p>
        </div>
        {!isSupabaseConfigured && (
          <p className="rounded-md bg-amber-100 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            Supabase não configurado. Copie <code>.env.example</code> para <code>.env</code> e preencha.
          </p>
        )}
        <label className="block space-y-1 text-sm">
          <span>E-mail</span>
          <input className="input" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Senha</span>
          <input className="input" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
