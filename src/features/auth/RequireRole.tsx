import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { UserRole } from '@/types/database.types'

export function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center p-6 text-sm text-slate-500">{children}</div>
}

/** Exige login; opcionalmente restringe a certos perfis. */
export function RequireRole({ roles }: { roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenMessage>Carregando…</FullScreenMessage>
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile) return <FullScreenMessage>Carregando perfil…</FullScreenMessage>
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}
