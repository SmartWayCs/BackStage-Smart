import { useMemo } from 'react'
import { useProfiles } from '@/features/projects/api'

export function useProfileMap() {
  const { data } = useProfiles()
  return useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data])
}
