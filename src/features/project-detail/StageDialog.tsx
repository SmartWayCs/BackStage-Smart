import { useState, type FormEvent } from 'react'
import { AlignLeft, CalendarClock, ImageIcon, Lock, NotebookText, Trash2, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import { Dialog } from '@/components/ui/Dialog'
import { ETAPA_STATUS_LABEL, ETAPA_STATUS_ORDER, RISCO_LABEL, RISCO_ORDER } from '@/lib/constants'
import { formatHours, parseHours } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/features/auth/AuthProvider'
import { useStageOwners } from '@/features/projects/api'
import { MemberPicker } from '@/features/projects/MemberPicker'
import { NotesEditor } from '@/features/notes/NotesEditor'
import { useAttachmentMutations, useAttachments, useSetStageMembers, useStageMutations } from './api'
import { Gallery, UploadButton } from './Gallery'
import type { EtapaStatus, RiscoNivel, Stage } from '@/types/database.types'

type Tab = 'explicacao' | 'prazos' | 'bloqueio' | 'notas' | 'imagens'

/** Detalhes de uma etapa, em partes: o essencial no topo e o resto em abas, com um único "Salvar". */
export function StageDialog({ stage, projectId, onClose }: { stage: Stage; projectId: string; onClose: () => void }) {
  const { canEdit } = usePermissions()
  const { profile } = useAuth()
  const { update, remove: removeStage } = useStageMutations(projectId)
  const { upload, remove } = useAttachmentMutations(projectId, profile?.id, { stage_id: stage.id })
  const mine = (useAttachments(projectId).data ?? []).filter((a) => a.stage_id === stage.id)
  const { owners } = useStageOwners()
  const setMembers = useSetStageMembers()
  const currentOwners = owners.get(stage.id) ?? []

  const [tab, setTab] = useState<Tab>('explicacao')
  const [nome, setNome] = useState(stage.nome)
  const [status, setStatus] = useState<EtapaStatus>(stage.status)
  const [descricao, setDescricao] = useState(stage.descricao ?? '')
  const [notas, setNotas] = useState(stage.notas ?? '')
  const [resp, setResp] = useState<string[]>(currentOwners)
  const [prev, setPrev] = useState(stage.horas_previstas?.toString() ?? '')
  const [real, setReal] = useState(stage.horas_realizadas?.toString() ?? '')
  const [inicio, setInicio] = useState(stage.data_inicio ?? '')
  const [prazo, setPrazo] = useState(stage.prazo ?? '')
  const [bloqueada, setBloqueada] = useState(stage.bloqueada)
  const [motivo, setMotivo] = useState(stage.bloqueio_motivo ?? '')
  const [risco, setRisco] = useState<RiscoNivel | ''>(stage.risco ?? '')

  const hPrev = parseHours(prev)
  const hReal = parseHours(real)

  function submit(e: FormEvent) {
    e.preventDefault()
    const changed = resp.length !== currentOwners.length || resp.some((id) => !currentOwners.includes(id))
    if (changed) setMembers.mutate({ stageId: stage.id, prev: currentOwners, next: resp })
    update.mutate({
      id: stage.id,
      patch: {
        nome: nome.trim(), status, descricao: descricao.trim() || null, notas: notas.trim() || null,
        horas_previstas: hPrev, horas_realizadas: hReal, data_inicio: inicio || null, prazo: prazo || null,
        bloqueada, bloqueio_motivo: bloqueada ? motivo.trim() || null : null, risco: risco || null,
      },
    }, { onSuccess: onClose })
  }

  const tabs: { id: Tab; label: string; icon: LucideIcon; badge?: React.ReactNode }[] = [
    { id: 'explicacao', label: 'Explicação', icon: AlignLeft },
    { id: 'prazos', label: 'Prazos e horas', icon: CalendarClock },
    { id: 'bloqueio', label: 'Bloqueio e risco', icon: Lock, badge: bloqueada ? <span className="size-2 rounded-full bg-red-500" aria-label="Bloqueada" /> : undefined },
    { id: 'notas', label: 'Notas', icon: NotebookText, badge: notas.trim() ? <span className="size-2 rounded-full bg-brand" aria-label="Tem notas" /> : undefined },
    { id: 'imagens', label: 'Imagens', icon: ImageIcon, badge: <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums dark:bg-slate-800">{mine.length}</span> },
  ]
  const label = 'block space-y-1 text-sm'

  return (
    <Dialog title={canEdit ? 'Detalhes da etapa' : stage.nome} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-[1fr_13rem]">
          <label className={label}><span>Nome da etapa *</span>
            <input className="input" required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          <label className={label}><span>Status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EtapaStatus)}>
              {ETAPA_STATUS_ORDER.map((s) => <option key={s} value={s}>{ETAPA_STATUS_LABEL[s]}</option>)}</select></label>
        </fieldset>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700" role="tablist" aria-label="Partes da etapa">
          {tabs.map((t) => {
            const active = tab === t.id
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)}
                className={clsx('-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100')}>
                <t.icon size={15} />{t.label}{t.badge}
              </button>
            )
          })}
        </nav>

        <div className="min-h-[19rem]" role="tabpanel">
          {tab === 'explicacao' && (
            <fieldset disabled={!canEdit} className="space-y-1.5">
              <label className={label}><span>O que será feito nesta etapa</span>
                <textarea className="input" rows={11} value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Explique com detalhes: objetivo, o que será entregue, como será feito, riscos, dependências…" /></label>
              <p className="text-xs text-slate-500">Dica: use as imagens (aba ao lado) para mostrar telas, fotos e diagramas.</p>
            </fieldset>
          )}

          {tab === 'prazos' && (
            <fieldset disabled={!canEdit} className="space-y-4">
              <div className="space-y-1 text-sm"><span>Responsáveis</span><MemberPicker value={resp} onChange={setResp} /></div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}><span>Início (opcional)</span>
                  <input className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
                <label className={label}><span>Prazo (opcional)</span>
                  <input className="input" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
                <label className={label}><span>Horas previstas</span>
                  <input className="input" inputMode="decimal" placeholder="Ex.: 40" value={prev} onChange={(e) => setPrev(e.target.value)} /></label>
                <label className={label}><span>Horas realizadas</span>
                  <input className="input" inputMode="decimal" placeholder="Ex.: 12,5" value={real} onChange={(e) => setReal(e.target.value)} /></label>
              </div>

              {hPrev !== null && hPrev > 0 && (
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{formatHours(hReal ?? 0)} de {formatHours(hPrev)}</span>
                    <span className={clsx('font-medium', (hReal ?? 0) > hPrev && 'text-red-600')}>{Math.round(((hReal ?? 0) / hPrev) * 100)}%{(hReal ?? 0) > hPrev ? ' · acima do previsto' : ''}</span>
                  </div>
                  <AnimatedBar value={hReal ?? 0} max={hPrev} />
                </div>
              )}
            </fieldset>
          )}

          {tab === 'bloqueio' && (
            <fieldset disabled={!canEdit} className="space-y-4">
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <input type="checkbox" className="mt-0.5" checked={bloqueada} onChange={(e) => setBloqueada(e.target.checked)} />
                <span><span className="flex items-center gap-1.5 font-medium"><Lock size={14} className="text-red-600" />Esta etapa está bloqueada</span>
                  <span className="text-xs text-slate-500">Aparece com destaque no card, no dashboard e em “Minhas etapas”.</span></span>
              </label>
              {bloqueada && (
                <label className={label}><span>Motivo do bloqueio</span>
                  <textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: aguardando liberação do fornecedor; depende da etapa anterior…" /></label>
              )}
              <label className={label}><span>Nível de risco</span>
                <select className="input sm:max-w-xs" value={risco} onChange={(e) => setRisco(e.target.value as RiscoNivel | '')}>
                  <option value="">Sem risco</option>
                  {RISCO_ORDER.map((r) => <option key={r} value={r}>{RISCO_LABEL[r]}</option>)}</select></label>
            </fieldset>
          )}

          {tab === 'notas' && (
            <section className="space-y-2">
              <p className="text-xs text-slate-500">Documentação desta etapa: decisões técnicas, acessos, contatos, “como funciona”. Aceita títulos, listas, negrito e links.</p>
              <NotesEditor value={notas} onChange={setNotas} readOnly={!canEdit} rows={12} />
            </section>
          )}

          {tab === 'imagens' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">Prints, fotos ou diagramas que expliquem a etapa (até 10 MB cada).</p>
                {canEdit && <UploadButton busy={upload.isPending} onFiles={(files) => files.forEach((f) => upload.mutate(f))} />}
              </div>
              <Gallery items={mine} canEdit={canEdit} onDelete={(a) => remove.mutate(a)} empty="Nenhuma imagem ainda." />
            </section>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {canEdit
            ? <button type="button" className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => {
                if (window.confirm(`Excluir a etapa "${stage.nome}" e as imagens dela?`)) removeStage.mutate(stage.id, { onSuccess: onClose })
              }}><Trash2 size={14} />Excluir etapa</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>{canEdit ? 'Cancelar' : 'Fechar'}</button>
            {canEdit && <button className="btn-primary" disabled={update.isPending || !nome.trim()}>{update.isPending ? 'Salvando…' : 'Salvar etapa'}</button>}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
