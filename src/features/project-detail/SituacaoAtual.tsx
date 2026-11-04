import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useUpdateProject } from '@/features/projects/api'
import type { ProjectRow } from '@/types/database.types'

export function SituacaoAtual({ project }: { project: ProjectRow }) {
  const { canEdit } = usePermissions()
  const update = useUpdateProject()
  const [text, setText] = useState(project.situacao_atual ?? '')
  useEffect(() => setText(project.situacao_atual ?? ''), [project.situacao_atual])
  const dirty = text.trim() !== (project.situacao_atual ?? '')

  return (
    <section className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30" aria-label="Situação atual">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <Activity size={16} />Situação atual — o que está acontecendo agora
      </h2>
      {canEdit ? (
        <div className="space-y-2">
          <textarea className="input" rows={2} maxLength={280} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: aguardando liberação do fornecedor; testando integração…" />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{text.length}/280</span>
            <button className="btn-primary" disabled={!dirty || update.isPending}
              onClick={() => update.mutate({ id: project.id, patch: { situacao_atual: text.trim() || null } })}>Atualizar</button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{project.situacao_atual || <span className="text-slate-500">Sem atualização.</span>}</p>
      )}
    </section>
  )
}
