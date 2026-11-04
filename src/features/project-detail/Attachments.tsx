import { useRef } from 'react'
import { Paperclip, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { toast } from '@/lib/toast'
import { timeAgo } from '@/lib/utils'
import { openAttachment, useAttachmentMutations, useAttachments } from './api'

const MAX_BYTES = 10 * 1024 * 1024

export function Attachments({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const { canEdit } = usePermissions()
  const profiles = useProfileMap()
  const { data, isLoading } = useAttachments(projectId)
  const { upload, remove } = useAttachmentMutations(projectId, profile?.id)
  const input = useRef<HTMLInputElement>(null)

  function onFiles(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      if (f.size > MAX_BYTES) { toast(`“${f.name}” passa de 10 MB.`); continue }
      upload.mutate(f)
    }
    if (input.current) input.current.value = ''
  }

  return (
    <section className="card p-4" aria-label="Anexos">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Paperclip size={16} />Anexos</h2>
      {canEdit && (
        <div className="mb-3">
          <input ref={input} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <button className="btn-ghost border border-dashed border-slate-300 dark:border-slate-700" disabled={upload.isPending} onClick={() => input.current?.click()}>
            <Upload size={14} />{upload.isPending ? 'Enviando…' : 'Enviar arquivo ou print (até 10 MB)'}
          </button>
        </div>
      )}
      {isLoading && <p className="text-sm text-slate-500">Carregando…</p>}
      {data && !data.length && <p className="text-sm text-slate-500">Nenhum anexo.</p>}
      <ul className="space-y-1.5">
        {data?.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
            <button className="min-w-0 truncate text-left text-brand hover:underline"
              onClick={() => openAttachment(a.arquivo_url).catch((e: Error) => toast(e.message))}>{a.nome}</button>
            <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
              {a.enviado_por ? profiles.get(a.enviado_por)?.nome : ''} · {timeAgo(a.created_at)}
              {canEdit && <button className="text-slate-400 hover:text-red-600" aria-label="Excluir anexo" onClick={() => remove.mutate(a)}><Trash2 size={13} /></button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
