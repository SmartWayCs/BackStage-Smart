import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, CalendarRange, ChevronDown, FileText, KeyRound, LogOut, Moon, Plug, Sun, Tv, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/hooks/useTheme'
import { useRealtimeSync } from '@/features/realtime/useRealtimeSync'
import { useRequests } from '@/features/requests/api'

const ROLE_LABEL = { ti: 'TI', supervisao: 'Supervisão', admin: 'Admin' } as const

// Botões da barra superior: texto claro sobre o vidro escuro
const iconBtn = 'inline-flex items-center justify-center rounded-md px-2.5 py-2 text-white/80 transition duration-200 hover:bg-white/15 hover:text-white active:scale-95'

const MORE: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/cronograma', label: 'Cronograma', icon: CalendarRange },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/relatorio', label: 'Relatório', icon: FileText },
  { to: '/tv', label: 'Modo TV', icon: Tv },
]

/** Menu "Mais": guarda as telas menos usadas para a barra não ficar lotada. */
function MoreMenu({ isAdmin }: { isAdmin: boolean }) {
  const items = isAdmin ? [...MORE, { to: '/admin/integracoes', label: 'Integrações', icon: Plug }] : MORE
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const active = items.some((m) => m.to !== '/tv' && pathname.startsWith(m.to))
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className={clsx('flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-px',
          active || open ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
        Mais<ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-52 animate-fade-in overflow-hidden rounded-xl border border-white/15 bg-[#0b1a3f]/95 p-1 shadow-2xl backdrop-blur-xl">
          {items.map((m) => (
            <NavLink key={m.to} to={m.to} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
              <m.icon size={15} />{m.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const { isAdmin, canEdit } = usePermissions()
  const requests = useRequests()
  const novos = canEdit ? (requests.data ?? []).filter((r) => r.status === 'novo').length : 0
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()
  useRealtimeSync(true)

  const link = ({ isActive }: { isActive: boolean }) =>
    clsx('rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-px',
      isActive ? 'bg-white/20 text-white shadow-inner shadow-white/10' : 'text-white/70 hover:bg-white/10 hover:text-white')

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-white/10 bg-[#071235]/40 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <NavLink to="/" className="group mr-3 flex items-center gap-2 font-semibold tracking-tight">
            <img src="/logo.png" alt="" width={34} height={34} className="drop-shadow transition-transform duration-500 group-hover:rotate-[360deg] group-hover:scale-110" />BackStage Smart
          </NavLink>
          <nav className="flex flex-1 flex-wrap gap-1">
            <NavLink to="/" end className={link}>Projetos</NavLink>
            <NavLink to="/quadro" className={link}>Quadro</NavLink>
            <NavLink to="/pedidos" className={link}>Pedidos{novos > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] font-bold text-navy-950" aria-label={`${novos} novos`}>{novos}</span>}</NavLink>
            <NavLink to="/minhas-etapas" className={link}>Minhas etapas</NavLink>
            <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
            <MoreMenu isAdmin={isAdmin} />
            {isAdmin && <NavLink to="/admin/usuarios" className={link}>Usuários</NavLink>}
          </nav>
          <span className="hidden font-mono text-[11px] uppercase tracking-wider text-white/60 sm:inline">
            {profile?.nome} · {profile && ROLE_LABEL[profile.role]}
          </span>
          <button className={clsx(iconBtn, 'group')} onClick={toggle} aria-label="Alternar tema">
            <span className="inline-block transition-transform duration-500 group-hover:rotate-180">{dark ? <Sun size={16} /> : <Moon size={16} />}</span>
          </button>
          <NavLink to="/trocar-senha" className={iconBtn} aria-label="Alterar minha senha" title="Alterar minha senha"><KeyRound size={16} /></NavLink>
          <button className={clsx(iconBtn, 'group')} onClick={signOut} aria-label="Sair"><LogOut size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" /></button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-3 pb-8 pt-5 sm:px-6 print:max-w-none print:p-0">
        {/* O conteúdo vive num painel claro por cima do fundo em degradê */}
        <div key={pathname} className="min-h-[calc(100vh-8rem)] animate-fade-up rounded-3xl border border-white/30 print:min-h-0 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none bg-[#f7f5f1] p-4 shadow-2xl shadow-black/50 sm:p-8 dark:border-white/10 dark:bg-slate-950/95">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
