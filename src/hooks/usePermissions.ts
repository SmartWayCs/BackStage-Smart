import { useAuth } from '@/features/auth/AuthProvider'

export function usePermissions() {
  const { profile } = useAuth()
  const role = profile?.role
  return {
    role,
    canEdit: role === 'ti' || role === 'admin', // TI edita; supervisão só lê/comenta
    isAdmin: role === 'admin',
  }
}
