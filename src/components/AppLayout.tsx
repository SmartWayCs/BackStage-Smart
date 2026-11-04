import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/hooks/useTheme'
import { useRealtimeSync } from '@/features/realtime/useRealtimeSync'

const ROLE_LABEL = { ti: 'TI', supervisao: 'Supervisão', admin: 'Admin' } as const

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const { isAdmin } = usePermissions()
  const { dark, toggle } = useTheme()
  useRealtimeSync(true)

  const link = ({ isActive }: { isActive: boolean }) =>
    clsx('rounded-md px-3 py-1.5 text-sm font-medium',
      isActive ? 'bg-slate-200 dark:bg-slate-800' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60')

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2">
          <span className="mr-2 font-semibold">BackStage Smart</span>
          <nav className="flex flex-1 flex-wrap gap-1">
            <NavLink to="/" end className={link}>Projetos</NavLink>
            <NavLink to="/dashboard" className={link}>Dashboard</NavLink>
            {isAdmin && <NavLink to="/admin/usuarios" className={link}>Usuários</NavLink>}
          </nav>
          <span className="hidden text-sm text-slate-500 sm:inline">
            {profile?.nome} · {profile && ROLE_LABEL[profile.role]}
          </span>
          <button className="btn-ghost" onClick={toggle} aria-label="Alternar tema">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="btn-ghost" onClick={signOut} aria-label="Sair"><LogOut size={16} /></button>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-4"><Outlet /></main>
    </div>
  )
}
