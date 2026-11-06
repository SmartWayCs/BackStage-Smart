import { useState, type FormEvent } from 'react'
import { PRIORITY_LABEL, PRIORITY_ORDER } from '@/lib/constants'
import { parseTags } from '@/lib/utils'
import { MemberPicker } from './MemberPicker'
import type { Priority, ProjetoModo } from '@/types/database.types'

export interface NewProjectValues {
  nome: string; descricao: string | null; prioridade: Priority; modo: ProjetoModo
  responsaveis_ids: string[]; data_inicio: string | null; prazo: string | null; tags: string[]
}

export function ProjectForm({ onSubmit, busy, onCancel }: {
  onSubmit: (v: NewProjectValues) => void; busy: boolean; onCancel: () => void
}) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState<Priority>('media')
  const [modo, setModo] = useState<ProjetoModo>('desenvolvimento')
  const [responsaveis, setResponsaveis] = useState<string[]>([])
  const [inicio, setInicio] = useState('')
  const [prazo, setPrazo] = useState('')
  const [tags, setTags] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      nome: nome.trim(), descricao: descricao.trim() || null, prioridade, modo,
      responsaveis_ids: responsaveis, data_inicio: inicio || null, prazo: prazo || null, tags: parseTags(tags),
    })
  }

  const label = 'block space-y-1 text-sm'
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={label}><span>Nome *</span>
        <input className="input" required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} /></label>
      <label className={label}><span>Descrição</span>
        <textarea className="input" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></label>
      <div className="space-y-1 text-sm"><span>Responsáveis</span><MemberPicker value={responsaveis} onChange={setResponsaveis} /></div>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}><span>Prioridade</span>
          <select className="input" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Priority)}>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
        <label className={label}><span>Tags (separadas por vírgula)</span>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
        <label className={label}><span>Fase do projeto</span>
          <select className="input" value={modo} onChange={(e) => setModo(e.target.value as ProjetoModo)}>
            <option value="desenvolvimento">Em desenvolvimento</option>
            <option value="manutencao">Em manutenção (já entregue)</option></select></label>
        <label className={label}><span>Início (opcional)</span>
          <input className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
        <label className={label}><span>Prazo (opcional)</span>
          <input className="input" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={busy || !nome.trim()}>{busy ? 'Criando…' : 'Criar projeto'}</button>
      </div>
    </form>
  )
}
