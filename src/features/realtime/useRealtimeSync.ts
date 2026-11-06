import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// tabela -> prefixos de queryKey que devem ser refeitos quando ela muda
const TABLES: Record<string, string[]> = {
  projects: ['projects', 'project'],
  project_members: ['projects', 'project'],
  project_stages: ['stages', 'tasks', 'projects', 'project'],
  stage_members: ['stage-members'],
  requests: ['requests'],
  ideas: ['ideas'],
  comments: ['comments'],
  attachments: ['attachments'],
  activity_log: ['activity'],
  profiles: ['profiles'],
}

/** Um canal Realtime; qualquer mudança invalida o cache e o TanStack Query refaz só o que está na tela. */
export function useRealtimeSync(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const pending = new Set<string>()
    const flush = () => {
      pending.forEach((key) => qc.invalidateQueries({ queryKey: [key] }))
      pending.clear()
    }

    let channel = supabase.channel('backstage-sync')
    for (const [table, keys] of Object.entries(TABLES)) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        keys.forEach((k) => pending.add(k))
        clearTimeout(timer)
        timer = setTimeout(flush, 250) // agrupa rajadas (ex.: um update + vários logs)
      })
    }
    channel.subscribe()

    return () => { clearTimeout(timer); supabase.removeChannel(channel) }
  }, [enabled, qc])
}
