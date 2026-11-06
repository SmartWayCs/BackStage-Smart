import type { UserRole } from '@/types/database.types'

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'ti', label: 'TI (editor)' },
  { value: 'supervisao', label: 'Supervisão (leitura)' },
  { value: 'admin', label: 'Admin' },
]
