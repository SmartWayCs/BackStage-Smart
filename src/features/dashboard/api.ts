import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('id, project_id, status, concluida_em')
      if (error) throw error
      return data
    },
  })
}
