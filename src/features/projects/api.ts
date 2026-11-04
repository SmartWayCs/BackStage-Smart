import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database, ProjectRow } from '@/types/database.types'

type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('nome')
      if (error) throw error
      return data
    },
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects_with_progress').select('*').order('posicao')
      if (error) throw error
      return data
    },
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('projects_with_progress').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectInsert) => {
      const { data, error } = await supabase.from('projects').insert(input).select('id').single()
      if (error) throw error
      return data.id
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ProjectUpdate }) => {
      const { error } = await supabase.from('projects').update(patch).eq('id', id)
      if (error) throw error
    },
    // Atualização otimista: o card muda de coluna na hora e volta se o servidor recusar.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['projects'] })
      await qc.cancelQueries({ queryKey: ['project', id] })
      const prevList = qc.getQueryData<ProjectRow[]>(['projects'])
      const prevOne = qc.getQueryData<ProjectRow | null>(['project', id])
      qc.setQueryData<ProjectRow[]>(['projects'], (old) => old?.map((p) => (p.id === id ? { ...p, ...patch } as ProjectRow : p)))
      qc.setQueryData<ProjectRow | null>(['project', id], (old) => (old ? { ...old, ...patch } as ProjectRow : old))
      return { prevList, prevOne }
    },
    onError: (_e, { id }, ctx) => {
      if (ctx?.prevList) qc.setQueryData(['projects'], ctx.prevList)
      if (ctx?.prevOne !== undefined) qc.setQueryData(['project', id], ctx.prevOne)
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['activity', id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
