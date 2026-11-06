import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, KanbanSquare, Loader2, Lock, Radio, ShieldCheck, User } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from './AuthProvider'
import { isSupabaseConfigured } from '@/lib/supabase'

const FEATURES = [
  { icon: KanbanSquare, title: 'Todos os projetos em um quadro', text: 'Do planejamento à entrega, com responsáveis e prazos.' },
  { icon: Radio, title: 'Atualização em tempo real', text: 'A supervisão acompanha o que a TI está fazendo agora.' },
  { icon: ShieldCheck, title: 'Acesso por perfil', text: 'TI edita, supervisão acompanha e comenta.' },
]

const PREVIEW = [
  { nome: 'Migração do servidor de arquivos', pct: 72, tag: 'Em andamento', cls: 'animate-float', pos: 'left-0 top-0 -rotate-3' },
  { nome: 'Renovação do parque de notebooks', pct: 40, tag: 'Planejamento', cls: 'animate-float-slow [animation-delay:-3s]', pos: 'left-10 top-28 rotate-2' },
  { nome: 'Backup em nuvem', pct: 100, tag: 'Concluído', cls: 'animate-float [animation-delay:-5s]', pos: 'left-2 top-56 -rotate-1' },
]

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* fundo: malha + brilhos animados */}
      <div className="bg-grid mask-fade absolute inset-0 animate-grid-pan opacity-25" />

      <header className="relative flex animate-fade-in items-center gap-3">
        <img src="/logo.png" alt="" width={48} height={48} className="drop-shadow-lg" />
        <span className="text-lg font-semibold tracking-tight">BackStage Smart</span>
      </header>

      <div className="relative grid gap-10 xl:grid-cols-[1fr_20rem] xl:items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="animate-fade-up text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Toda a TI,<br /><span className="text-gradient">em um só quadro.</span>
            </h2>
            <p className="max-w-md animate-fade-up text-slate-300 [animation-delay:120ms]">
              Organize projetos, acompanhe tarefas e dê à supervisão visibilidade em tempo real do que está sendo feito.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="flex animate-fade-up gap-3" style={{ animationDelay: `${260 + i * 120}ms` }}>
                <span className="glass grid size-10 shrink-0 place-items-center rounded-lg text-accent"><f.icon size={18} /></span>
                <span><span className="block text-sm font-medium">{f.title}</span><span className="text-sm text-slate-400">{f.text}</span></span>
              </li>
            ))}
          </ul>
        </div>

        {/* prévia flutuante do produto */}
        <div className="relative hidden h-80 xl:block" aria-hidden="true">
          {PREVIEW.map((c, i) => (
            <div key={c.nome} className={clsx('absolute w-64', c.pos)}>
              <div className={clsx('animate-fade-up', c.cls)} style={{ animationDelay: `${500 + i * 150}ms` }}>
                <div className="rounded-xl bg-white p-3 text-slate-900 shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{c.tag}</span><span className="tabular-nums">{c.pct}%</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug">{c.nome}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full animate-bar-grow rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${c.pct}%`, animationDelay: `${900 + i * 150}ms` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative text-xs text-white/60">© {new Date().getFullYear()} Smartway · Uso interno</footer>
    </aside>
  )
}

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname: string } } }
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  if (session) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const err = await signIn(identifier, password)
    setBusy(false)
    if (err) {
      setError(err === 'Invalid login credentials' ? 'Usuário/e-mail ou senha inválidos.' : err)
      setShakeKey((k) => k + 1)
    } else navigate('/', { replace: true })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <BrandPanel />

      <main className="relative grid place-items-center p-4 sm:p-8">
        <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-white/40 bg-[#f7f5f1] p-7 shadow-2xl shadow-black/50 dark:bg-slate-900 sm:p-9">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="" width={48} height={48} className="drop-shadow-lg" />
            <span className="text-lg font-semibold tracking-tight">BackStage Smart</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com sua conta para acessar os projetos da TI.</p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-md bg-amber-100 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              Supabase não configurado. Copie <code>.env.example</code> para <code>.env</code> e preencha.
            </p>
          )}

          <form onSubmit={onSubmit} key={shakeKey} className={clsx('mt-8 space-y-4', shakeKey > 0 && 'animate-shake')}>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>E-mail ou usuário</span>
              <span className="relative block">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input h-11 pl-10" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="usuario ou voce@empresa.com"
                  value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              </span>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Senha</span>
              <span className="relative block">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input h-11 pl-10 pr-11" type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {error && <p role="alert" className="animate-fade-in rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

            <button disabled={busy}
              className="group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-brand via-sky-500 to-brand bg-[length:200%_auto] font-medium text-white shadow-lg shadow-brand/30 transition-all duration-500 hover:bg-right hover:shadow-brand/50 disabled:opacity-70">
              {busy ? <><Loader2 size={18} className="animate-spin" />Entrando…</>
                : <>Entrar<ArrowRight size={18} className="transition group-hover:translate-x-1" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">Problemas para acessar? Fale com o administrador da TI.</p>
        </div>
      </main>
    </div>
  )
}
