import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireRole } from '@/features/auth/RequireRole'
import { AppLayout } from '@/components/AppLayout'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { Toaster } from '@/components/Toaster'

// Recharts é pesado: só carrega ao abrir o dashboard
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
import { ProjectPage } from '@/features/project-detail/ProjectPage'
import { UsersPage } from '@/features/admin/UsersPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireRole />}>
              <Route element={<AppLayout />}>
                <Route index element={<ProjectsPage />} />
                <Route path="projetos/:id" element={<ProjectPage />} />
                <Route path="dashboard" element={<Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}><DashboardPage /></Suspense>} />
                <Route element={<RequireRole roles={['admin']} />}>
                  <Route path="admin/usuarios" element={<UsersPage />} />
                </Route>
                <Route path="*" element={<p className="text-sm">Página não encontrada.</p>} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}
