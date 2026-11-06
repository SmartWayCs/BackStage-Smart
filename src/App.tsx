import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { RequireRole } from '@/features/auth/RequireRole'
import { AppLayout } from '@/components/AppLayout'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { Toaster } from '@/components/Toaster'

// Recharts é pesado: só carrega ao abrir o dashboard
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
import { ProjectPage } from '@/features/project-detail/ProjectPage'
import { UsersPage } from '@/features/admin/UsersPage'
import { MyStagesPage } from '@/features/projects/MyStagesPage'
import { GanttPage } from '@/features/projects/GanttPage'
import { ReportPage } from '@/features/projects/ReportPage'
import { BoardPage } from '@/features/projects/BoardPage'
import { CalendarPage } from '@/features/projects/CalendarPage'
import { RequestsPage } from '@/features/requests/RequestsPage'
import { TvPage } from '@/features/tv/TvPage'
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/trocar-senha" element={<ChangePasswordPage />} />
            <Route element={<RequireRole />}>
              <Route path="/tv" element={<TvPage />} />
              <Route element={<AppLayout />}>
                <Route index element={<ProjectsPage />} />
                <Route path="quadro" element={<BoardPage />} />
                <Route path="calendario" element={<CalendarPage />} />
                <Route path="pedidos" element={<RequestsPage />} />
                <Route path="minhas-etapas" element={<MyStagesPage />} />
                <Route path="cronograma" element={<GanttPage />} />
                <Route path="relatorio" element={<ReportPage />} />
                <Route path="projetos/:id" element={<ProjectPage />} />
                <Route path="dashboard" element={<Suspense fallback={<p className="text-sm text-slate-500">Carregando…</p>}><DashboardPage /></Suspense>} />
                <Route element={<RequireRole roles={['admin']} />}>
                  <Route path="admin/usuarios" element={<UsersPage />} />
                  <Route path="admin/integracoes" element={<IntegrationsPage />} />
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
