import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { PRIORITY_LABEL, PRIORITY_ORDER } from '@/lib/constants'
import { parseHours, parseTags } from '@/lib/utils'
import { useDeleteProject, useSetProjectMembers, useUpdateProject } from '@/features/projects/api'
import { MemberPicker } from '@/features/projects/MemberPicker'
import type { Priority, ProjectRow, ProjetoModo } from '@/types/database.types'

/** Edição de todos os dados do projeto numa janela só, com um único "Salvar". */
export function EditProjectDialog({ project, onClose }: { project: ProjectRow; onClose: () => void }) {
  const navigate = useNavigate()
  const update = useUpdateProject()
  const setMembers = useSetProjectMembers()
  const del = useDeleteProject()

  const [nome, setNome] = useState(project.nome)
  const [descricao, setDescricao] = useState(project.descricao ?? '')
  const [prioridade, setPrioridade] = useState<Priority>(project.prioridade)
  const [modo, setModo] = useState<ProjetoModo>(project.modo)
  const [inicio, setInicio] = useState(project.data_inicio ?? '')
  const [prazo, setPrazo] = useState(project.prazo ?? '')
  const [tags, setTags] = useState(project.tags.join(', '))
  const [horas, setHoras] = useState(project.horas_previstas?.toString() ?? '')
  const [responsaveis, setResponsaveis] = useState<string[]>(project.responsaveis_ids)

  function submit(e: FormEvent) {
    e.preventDefault()
    const changedMembers = responsaveis.length !== project.responsaveis_ids.length || responsaveis.some((id) => !project.responsaveis_ids.includes(id))
    if (changedMembers) setMembers.mutate({ projectId: project.id, prev: project.responsaveis_ids, next: responsaveis })
    update.mutate({
      id: project.id,
      patch: { nome: nome.trim(), descricao: descricao.trim() || null, prioridade, modo, data_inicio: inicio || null, prazo: prazo || null, tags: parseTags(tags), horas_previstas: parseHours(horas) },
    }, { onSuccess: onClose })
  }

  const label = 'block space-y-1 text-sm'
  return (
    <Dialog title="Editar projeto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className={label}><span>Nome *</span>
          <input className="input" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className={label}><span>Descrição</span>
          <textarea className="input" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></label>
        <div className="space-y-1 text-sm"><span>Responsáveis</span><MemberPicker value={responsaveis} onChange={setResponsaveis} /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}><span>Prioridade</span>
            <select className="input" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Priority)}>
              {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
          <label className={label}><span>Previsão de horas do projeto</span>
            <input className="input" inputMode="decimal" placeholder="Ex.: 960" value={horas} onChange={(e) => setHoras(e.target.value)} /></label>
          <label className={label}><span>Fase do projeto</span>
            <select className="input" value={modo} onChange={(e) => setModo(e.target.value as ProjetoModo)}>
              <option value="desenvolvimento">Em desenvolvimento</option>
              <option value="manutencao">Em manutenção (já entregue)</option></select></label>
          <label className={label}><span>Início (opcional)</span>
            <input className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
          <label className={label}><span>Prazo (opcional)</span>
            <input className="input" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
          <label className={`${label} col-span-2`}><span>Tags (separadas por vírgula)</span>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => {
            if (window.confirm(`Excluir o projeto "${project.nome}" e tudo dentro dele (etapas, tarefas, ideias, comentários)?`))
              del.mutate(project.id, { onSuccess: () => navigate('/') })
          }}><Trash2 size={14} />Excluir projeto</button>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={update.isPending || !nome.trim()}>{update.isPending ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
