import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER } from '@/lib/constants'
import type { Database, EtapaStatus, ProjectRow } from '@/types/database.types'

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
      const { data, error } = await supabase.from('projects_with_progress').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Todas as etapas de todos os projetos, só com os campos leves usados em resumos e no dashboard. */
export function useAllStages() {
  return useQuery({
    queryKey: ['stages', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_stages').select('*').order('posicao')
      if (error) throw error
      return data
    },
  })
}

/** Responsáveis de todas as etapas: { idDaEtapa -> [ids dos usuários] }. */
export function useStageOwners() {
  const q = useQuery({
    queryKey: ['stage-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stage_members').select('stage_id, user_id')
      if (error) throw error
      return data
    },
  })
  const map = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const r of q.data ?? []) m.set(r.stage_id, [...(m.get(r.stage_id) ?? []), r.user_id])
    return m
  }, [q.data])
  return { owners: map, isLoading: q.isLoading }
}

/** Muda o status de uma etapa de qualquer projeto (usado no quadro geral). */
export function useMoveStageStatus() {
  const qc = useQueryClient()
  type Row = NonNullable<ReturnType<typeof useAllStages>['data']>[number]
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EtapaStatus }) => {
      const { error } = await supabase.from('project_stages').update({ status }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['stages', 'all'] })
      const prev = qc.getQueryData<Row[]>(['stages', 'all'])
      qc.setQueryData<Row[]>(['stages', 'all'], (old) => old?.map((e) => (e.id === id ? { ...e, status } : e)))
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['stages', 'all'], ctx.prev) },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['stages'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

export interface StageCount { nome: string; count: number; is_done: boolean }

/** Por projeto: quantas etapas há em cada status (só os que têm etapas). */
export function useStageSummary() {
  const stages = useAllStages()
  return useMemo(() => {
    const counts = new Map<string, Record<EtapaStatus, number>>()
    for (const e of stages.data ?? []) {
      const c = counts.get(e.project_id) ?? { ideia: 0, planejamento: 0, em_andamento: 0, em_pausa: 0, concluido: 0 }
      c[e.status]++
      counts.set(e.project_id, c)
    }
    const byProject = new Map<string, StageCount[]>()
    for (const [id, c] of counts) {
      byProject.set(id, ETAPA_STATUS_ORDER.filter((st) => c[st] > 0).map((st) => ({ nome: ETAPA_STATUS_LABEL[st], count: c[st], is_done: st === 'concluido' })))
    }
    return byProject
  }, [stages.data])
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
    mutationFn: async ({ project, responsaveis }: { project: ProjectInsert; responsaveis: string[] }) => {
      const { data, error } = await supabase.from('projects').insert(project).select('id').single()
      if (error) throw error
      if (responsaveis.length) {
        const { error: memberError } = await supabase.from('project_members')
          .insert(responsaveis.map((user_id) => ({ project_id: data.id, user_id })))
        if (memberError) throw memberError
      }
      return data.id
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

/** Troca a lista de responsáveis do projeto (insere os novos e remove os retirados). */
export function useSetProjectMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, prev, next }: { projectId: string; prev: string[]; next: string[] }) => {
      const toAdd = next.filter((id) => !prev.includes(id))
      const toRemove = prev.filter((id) => !next.includes(id))
      if (toAdd.length) {
        const { error } = await supabase.from('project_members').insert(toAdd.map((user_id) => ({ project_id: projectId, user_id })))
        if (error) throw error
      }
      if (toRemove.length) {
        const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).in('user_id', toRemove)
        if (error) throw error
      }
    },
    onMutate: async ({ projectId, next }) => {
      await qc.cancelQueries({ queryKey: ['projects'] })
      await qc.cancelQueries({ queryKey: ['project', projectId] })
      const prevList = qc.getQueryData<ProjectRow[]>(['projects'])
      const prevOne = qc.getQueryData<ProjectRow | null>(['project', projectId])
      qc.setQueryData<ProjectRow[]>(['projects'], (old) => old?.map((p) => (p.id === projectId ? { ...p, responsaveis_ids: next } : p)))
      qc.setQueryData<ProjectRow | null>(['project', projectId], (old) => (old ? { ...old, responsaveis_ids: next } : old))
      return { prevList, prevOne }
    },
    onError: (_e, { projectId }, ctx) => {
      if (ctx?.prevList) qc.setQueryData(['projects'], ctx.prevList)
      if (ctx?.prevOne !== undefined) qc.setQueryData(['project', projectId], ctx.prevOne)
    },
    onSettled: (_d, _e, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
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
