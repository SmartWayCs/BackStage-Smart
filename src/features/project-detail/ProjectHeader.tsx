import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from '@/lib/constants'
import { formatDate, parseTags } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useDeleteProject, useProfiles, useUpdateProject } from '@/features/projects/api'
import { ProgressBar, Tags } from '@/features/projects/ProjectCard'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import type { Priority, ProjectRow, ProjectStatus } from '@/types/database.types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-xs text-slate-500"><span>{label}</span><div className="text-sm text-slate-900 dark:text-slate-100">{children}</div></label>
}

export function ProjectHeader({ project }: { project: ProjectRow }) {
  const { canEdit } = usePermissions()
  const navigate = useNavigate()
  const profiles = useProfiles()
  const profileMap = useProfileMap()
  const update = useUpdateProject()
  const del = useDeleteProject()

  const [nome, setNome] = useState(project.nome)
  const [descricao, setDescricao] = useState(project.descricao ?? '')
  const [tags, setTags] = useState(project.tags.join(', '))
  useEffect(() => setNome(project.nome), [project.nome])
  useEffect(() => setDescricao(project.descricao ?? ''), [project.descricao])
  useEffect(() => setTags(project.tags.join(', ')), [project.tags])

  const save = (patch: Parameters<typeof update.mutate>[0]['patch']) => update.mutate({ id: project.id, patch })

  if (!canEdit) {
    return (
      <header className="card space-y-4 p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{project.nome}</h1>
          {project.descricao && <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{project.descricao}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Status">{STATUS_LABEL[project.status]}</Field>
          <Field label="Responsável">{project.responsavel_id ? profileMap.get(project.responsavel_id)?.nome : '—'}</Field>
          <Field label="Prioridade"><PriorityBadge value={project.prioridade} /></Field>
          <Field label="Início">{formatDate(project.data_inicio)}</Field>
          <Field label="Prazo">{formatDate(project.prazo)}</Field>
          <Field label="Tags">{project.tags.length ? <Tags tags={project.tags} /> : '—'}</Field>
        </div>
        <ProgressBar value={project.progresso} />
      </header>
    )
  }

  return (
    <header className="card space-y-4 p-4">
      <div className="flex items-start gap-2">
        <input className="input text-lg font-semibold" aria-label="Nome do projeto" value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => { const v = nome.trim(); if (!v) setNome(project.nome); else if (v !== project.nome) save({ nome: v }) }} />
        <button className="btn-ghost text-red-600" aria-label="Excluir projeto" onClick={() => {
          if (window.confirm(`Excluir o projeto "${project.nome}" e tudo dentro dele (tarefas, ideias, comentários)?`))
            del.mutate(project.id, { onSuccess: () => navigate('/') })
        }}><Trash2 size={16} /></button>
      </div>
      <textarea className="input" rows={2} placeholder="Descrição" aria-label="Descrição" value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        onBlur={() => { if (descricao !== (project.descricao ?? '')) save({ descricao: descricao.trim() || null }) }} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Status">
          <select className="input" value={project.status} onChange={(e) => save({ status: e.target.value as ProjectStatus })}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
        <Field label="Responsável">
          <select className="input" value={project.responsavel_id ?? ''} onChange={(e) => save({ responsavel_id: e.target.value || null })}>
            <option value="">Sem responsável</option>
            {profiles.data?.filter((p) => p.role !== 'supervisao' || p.id === project.responsavel_id).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
        <Field label="Prioridade">
          <select className="input" value={project.prioridade} onChange={(e) => save({ prioridade: e.target.value as Priority })}>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Field>
        <Field label="Início">
          <input className="input" type="date" value={project.data_inicio ?? ''} onChange={(e) => save({ data_inicio: e.target.value || null })} /></Field>
        <Field label="Prazo">
          <input className="input" type="date" value={project.prazo ?? ''} onChange={(e) => save({ prazo: e.target.value || null })} /></Field>
        <Field label="Tags (vírgula)">
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)}
            onBlur={() => { const t = parseTags(tags); if (t.join() !== project.tags.join()) save({ tags: t }) }} /></Field>
      </div>
      <ProgressBar value={project.progresso} />
    </header>
  )
}
