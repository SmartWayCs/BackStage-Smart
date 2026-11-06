import { ETAPA_STATUS_HEX, ETAPA_STATUS_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import { Gantt, type GanttRow } from '@/components/Gantt'
import { formatHours } from '@/lib/utils'
import { useStages } from './api'
import type { ProjectRow } from '@/types/database.types'

/** Cronograma do projeto: a barra do projeto e uma barra por etapa, pelas datas de início e prazo. */
export function ScheduleTab({ project }: { project: ProjectRow }) {
  const stages = useStages(project.id).data ?? []
  const rows: GanttRow[] = [
    { id: 'p', label: project.nome, sub: project.modo === 'manutencao' ? 'Projeto em manutenção' : 'Projeto', start: project.modo === 'manutencao' ? null : project.data_inicio, end: project.modo === 'manutencao' ? null : project.prazo, color: PRIORITY_COLOR[project.prioridade], progress: project.modo === 'manutencao' ? undefined : project.progresso, strong: true },
    ...stages.map((s) => ({
      id: s.id, label: s.nome, sub: `${ETAPA_STATUS_LABEL[s.status]}${s.horas_previstas !== null ? ` · ${formatHours(s.horas_previstas)}` : ''}`,
      start: s.data_inicio, end: s.prazo, color: ETAPA_STATUS_HEX[s.status], blocked: s.bloqueada, indent: true,
      progress: s.status === 'concluido' ? 100 : undefined,
    })),
  ]
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">As barras usam as datas de início e prazo do projeto e de cada etapa. Defina as datas em <strong>Editar projeto</strong> e nos detalhes das etapas. A cor da etapa segue o status; o contorno vermelho indica bloqueio.</p>
      <Gantt rows={rows} empty="Defina as datas de início e prazo do projeto ou das etapas para ver o cronograma." />
    </div>
  )
}
