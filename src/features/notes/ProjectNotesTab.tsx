import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import { NotesEditor } from './NotesEditor'

/** Notas e documentação do projeto: decisões técnicas, acessos, contatos, "como funciona". */
export function ProjectNotesTab({ projectId }: { projectId: string }) {
  const { canEdit } = usePermissions()
  const qc = useQueryClient()
  const note = useQuery({
    queryKey: ['project-notes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('notas').eq('id', projectId).single()
      if (error) throw error
      return data.notas ?? ''
    },
  })
  const save = useMutation({
    mutationFn: async (notas: string) => {
      const { error } = await supabase.from('projects').update({ notas: notas.trim() || null }).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-notes', projectId] }),
  })
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  useEffect(() => { if (!editing) setText(note.data ?? '') }, [note.data, editing])

  return (
    <section className="card max-w-4xl space-y-4 p-5" aria-label="Notas do projeto">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Notas e documentação</h2>
          <p className="text-xs text-slate-500">Decisões técnicas, acessos, contatos, “como funciona”. Aceita títulos, listas, negrito e links.</p>
        </div>
        {canEdit && !editing && <button className="btn-ghost rounded-xl border border-slate-200 dark:border-slate-700" onClick={() => setEditing(true)}><Pencil size={14} />Editar</button>}
      </div>
      {note.isLoading && <div className="skeleton h-24" />}
      {note.error && <p className="text-sm text-red-600">Erro ao carregar as notas.</p>}
      {note.data !== undefined && (editing
        ? (
          <div className="space-y-3">
            <NotesEditor value={text} onChange={setText} rows={16} />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
              <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(text, { onSuccess: () => setEditing(false) })}>{save.isPending ? 'Salvando…' : 'Salvar notas'}</button>
            </div>
          </div>
        )
        : <NotesEditor value={note.data} onChange={() => {}} readOnly />)}
    </section>
  )
}
