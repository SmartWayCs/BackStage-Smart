import { useMemo, useState } from 'react'
import { ETAPA_STATUS_HEX, ETAPA_STATUS_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import { Gantt, type GanttRow } from '@/components/Gantt'
import { isProjectDone } from '@/lib/utils'
import { useAllStages, useProjects } from './api'

/** Cronograma de todos os projetos: uma barra por projeto, e opcionalmente as etapas de cada um. */
export function GanttPage() {
  const projects = useProjects()
  const stages = useAllStages()
  const [withStages, setWithStages] = useState(true)
  const [withDone, setWithDone] = useState(false)

  const rows = useMemo(() => {
    const out: GanttRow[] = []
    for (const p of projects.data ?? []) {
      if (!withDone && isProjectDone(p)) continue
      out.push({ id: p.id, label: p.nome, sub: p.modo === 'manutencao' ? 'Em manutenção' : `${p.progresso}% concluído`, start: p.modo === 'manutencao' ? null : p.data_inicio, end: p.modo === 'manutencao' ? null : p.prazo, color: PRIORITY_COLOR[p.prioridade], progress: p.modo === 'manutencao' ? undefined : p.progresso, to: `/projetos/${p.id}`, strong: true })
      if (withStages) {
        for (const s of (stages.data ?? []).filter((x) => x.project_id === p.id)) {
          out.push({ id: s.id, label: s.nome, sub: ETAPA_STATUS_LABEL[s.status], start: s.data_inicio, end: s.prazo, color: ETAPA_STATUS_HEX[s.status], blocked: s.bloqueada, indent: true, progress: s.status === 'concluido' ? 100 : undefined })
        }
      }
    }
    return out
  }, [projects.data, stages.data, withStages, withDone])

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Visão geral</p>
          <h1 className="text-3xl font-bold tracking-tight">Cronograma</h1>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={withStages} onChange={(e) => setWithStages(e.target.checked)} />Mostrar etapas</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={withDone} onChange={(e) => setWithDone(e.target.checked)} />Incluir projetos concluídos</label>
        </div>
      </header>
      {(projects.isLoading || stages.isLoading) && <div className="skeleton h-64" />}
      {projects.data && <Gantt rows={rows} empty="Nenhum projeto com datas cadastradas. Defina início e prazo em “Editar projeto”." />}
    </section>
  )
}
