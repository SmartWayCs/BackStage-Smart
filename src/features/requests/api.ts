import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type RequestUpdate = Database['public']['Tables']['requests']['Update']

export function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useRequestMutations(userId: string | undefined) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['requests'] })

  const create = useMutation({
    mutationFn: async (v: { titulo: string; descricao: string | null; setor: string | null; urgencia: Database['public']['Tables']['requests']['Row']['urgencia'] }) => {
      if (!userId) throw new Error('Sessão inválida')
      const { error } = await supabase.from('requests').insert({ ...v, solicitante_id: userId })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RequestUpdate }) => {
      const { error } = await supabase.from('requests').update(patch).eq('id', id)
      if (error) throw error
    },
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: refresh,
  })
  const toProject = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('convert_request_to_project', { p_request_id: id })
      if (error) throw error
      return data as string
    },
    onSettled: () => { refresh(); qc.invalidateQueries({ queryKey: ['projects'] }) },
  })
  return { create, update, remove, toProject }
}
