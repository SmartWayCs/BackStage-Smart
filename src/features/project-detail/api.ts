import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Attachment, Database, Task } from '@/types/database.types'

type TaskUpdate = Database['public']['Tables']['tasks']['Update']

// ---------- tarefas ----------
export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('posicao')
      if (error) throw error
      return data
    },
  })
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { titulo: string; responsavel_id?: string | null; prazo?: string | null; posicao: number }) => {
      const { error } = await supabase.from('tasks').insert({ project_id: projectId, ...input })
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskUpdate }) => {
      const { error } = await supabase.from('tasks').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['tasks', projectId] })
      const prev = qc.getQueryData<Task[]>(['tasks', projectId])
      qc.setQueryData<Task[]>(['tasks', projectId], (old) => old?.map((t) => (t.id === id ? { ...t, ...patch } as Task : t)))
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['tasks', projectId], ctx.prev) },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['activity', projectId] })
    },
  })
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
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
    qc.invalidateQueries({ queryKey: ['tasks'] })
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
      const { error } = await supabase.rpc('convert_idea_to_task', { p_idea_id: ideaId })
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

export function useAttachmentMutations(projectId: string, userId: string | undefined) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['attachments', projectId] })
    qc.invalidateQueries({ queryKey: ['activity', projectId] })
  }
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${projectId}/${crypto.randomUUID()}-${safe}`
      const up = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type || undefined })
      if (up.error) throw up.error
      const { error } = await supabase.from('attachments').insert({ project_id: projectId, arquivo_url: path, nome: file.name, enviado_por: userId })
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
