import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Attachment, Database, EtapaStatus, Stage } from '@/types/database.types'

type StageUpdate = Database['public']['Tables']['project_stages']['Update']


// ---------- etapas ----------
export function useStages(projectId: string) {
  return useQuery({
    queryKey: ['stages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_stages').select('*').eq('project_id', projectId).order('posicao')
      if (error) throw error
      return data
    },
  })
}

export function useStageMutations(projectId: string) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['stages'] })
    qc.invalidateQueries({ queryKey: ['activity', projectId] })
    qc.invalidateQueries({ queryKey: ['projects'] })
    qc.invalidateQueries({ queryKey: ['project', projectId] })
  }
  const create = useMutation({
    mutationFn: async (v: { nome: string; posicao: number; status?: EtapaStatus }) => {
      const { error } = await supabase.from('project_stages').insert({ project_id: projectId, ...v })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: StageUpdate }) => {
      const { error } = await supabase.from('project_stages').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['stages', projectId] })
      const prev = qc.getQueryData<Stage[]>(['stages', projectId])
      qc.setQueryData<Stage[]>(['stages', projectId], (old) => old?.map((s) => (s.id === id ? { ...s, ...patch } as Stage : s)))
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['stages', projectId], ctx.prev) },
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_stages').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: refresh,
  })
  return { create, update, remove }
}

// ---------- ideias ----------
export function useIdeas(projectId: string) {
  return useQuery({
    queryKey: ['ideas', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ideas').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useIdeaMutations(projectId: string, autorId: string | undefined) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['ideas', projectId] })
    qc.invalidateQueries({ queryKey: ['projects'] })
    qc.invalidateQueries({ queryKey: ['project', projectId] })
    qc.invalidateQueries({ queryKey: ['activity', projectId] })
  }
  const create = useMutation({
    mutationFn: async (v: { titulo: string; descricao: string | null }) => {
      const { error } = await supabase.from('ideas').insert({ project_id: projectId, autor_id: autorId, ...v })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const convert = useMutation({
    mutationFn: async (ideaId: string) => {
      const { error } = await supabase.rpc('convert_idea_to_stage', { p_idea_id: ideaId })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ideas').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: refresh,
  })
  return { create, convert, remove }
}

// ---------- comentários ----------
export function useComments(projectId: string) {
  return useQuery({
    queryKey: ['comments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('comments').select('*').eq('project_id', projectId).order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useCommentMutations(projectId: string, autorId: string | undefined) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['comments', projectId] })
    qc.invalidateQueries({ queryKey: ['activity', projectId] })
  }
  const create = useMutation({
    mutationFn: async (v: { conteudo: string; mencoes: string[] }) => {
      if (!autorId) throw new Error('Sessão inválida')
      const { error } = await supabase.from('comments').insert({ project_id: projectId, autor_id: autorId, ...v })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: refresh,
  })
  return { create, remove }
}

// ---------- anexos ----------
export function useAttachments(projectId: string) {
  return useQuery({
    queryKey: ['attachments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('attachments').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** `scope` diz a quem o arquivo pertence: ao projeto (vazio), a uma etapa ou a uma tarefa. */
export function useAttachmentMutations(projectId: string, userId: string | undefined, scope: { stage_id?: string } = {}) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['attachments', projectId] })
    qc.invalidateQueries({ queryKey: ['activity', projectId] })
  }
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const folder = scope.stage_id ? `etapas/${scope.stage_id}` : 'projeto'
      const path = `${projectId}/${folder}/${crypto.randomUUID()}-${safe}`
      const up = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type || undefined })
      if (up.error) throw up.error
      const { error } = await supabase.from('attachments').insert({
        project_id: projectId, arquivo_url: path, nome: file.name, enviado_por: userId,
        stage_id: scope.stage_id ?? null,
      })
      if (error) {
        await supabase.storage.from('attachments').remove([path]) // não deixa arquivo órfão
        throw error
      }
    },
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async (a: Attachment) => {
      const { error } = await supabase.from('attachments').delete().eq('id', a.id)
      if (error) throw error
      await supabase.storage.from('attachments').remove([a.arquivo_url])
    },
    onSettled: refresh,
  })
  return { upload, remove }
}

/** Troca a lista de responsáveis de uma etapa (insere os novos e remove os retirados). */
export function useSetStageMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ stageId, prev, next }: { stageId: string; prev: string[]; next: string[] }) => {
      const toAdd = next.filter((id) => !prev.includes(id))
      const toRemove = prev.filter((id) => !next.includes(id))
      if (toAdd.length) {
        const { error } = await supabase.from('stage_members').insert(toAdd.map((user_id) => ({ stage_id: stageId, user_id })))
        if (error) throw error
      }
      if (toRemove.length) {
        const { error } = await supabase.from('stage_members').delete().eq('stage_id', stageId).in('user_id', toRemove)
        if (error) throw error
      }
    },
    onMutate: async ({ stageId, next }) => {
      await qc.cancelQueries({ queryKey: ['stage-members'] })
      const prevData = qc.getQueryData<{ stage_id: string; user_id: string }[]>(['stage-members'])
      qc.setQueryData<{ stage_id: string; user_id: string }[]>(['stage-members'], (old) => [
        ...(old ?? []).filter((r) => r.stage_id !== stageId), ...next.map((user_id) => ({ stage_id: stageId, user_id })),
      ])
      return { prevData }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prevData) qc.setQueryData(['stage-members'], ctx.prevData) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['stage-members'] }) },
  })
}

/** Links temporários (1 h) para exibir imagens do bucket privado. Devolve { caminho: url }. */
export function useSignedUrls(paths: string[]) {
  const key = [...paths].sort().join('|')
  return useQuery({
    queryKey: ['signed-urls', key],
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('attachments').createSignedUrls(paths, 3600)
      if (error) throw error
      const map: Record<string, string> = {}
      for (const d of data) if (d.path && d.signedUrl) map[d.path] = d.signedUrl
      return map
    },
  })
}

export async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 60)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener')
}

// ---------- histórico ----------
export function useActivity(projectId: string) {
  return useQuery({
    queryKey: ['activity', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_log').select('*').eq('project_id', projectId)
        .order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return data
    },
  })
}
