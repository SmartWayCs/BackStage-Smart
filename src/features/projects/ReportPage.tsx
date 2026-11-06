import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { PRIORITY_LABEL, ETAPA_STATUS_LABEL, RISCO_LABEL } from '@/lib/constants'
import { formatDate, formatHours, isProjectDone, projectOverdue } from '@/lib/utils'
import { useProfileMap } from '@/hooks/useProfileMap'
import { useAllStages, useProjects, useStageOwners } from './api'

const q = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`

/** Relatório para a supervisão: imprime/salva em PDF ou baixa em planilha (CSV que o Excel abre direto). */
export function ReportPage() {
  const [params, setParams] = useSearchParams()
  const projects = useProjects()
  const stages = useAllStages()
  const profiles = useProfileMap()
  const { owners: stageOwners } = useStageOwners()
  const [withDone, setWithDone] = useState(true)
  const [withText, setWithText] = useState(true)
  const only = params.get('projeto') ?? ''

  const list = useMemo(
    () => (projects.data ?? []).filter((p) => (only ? p.id === only : withDone || !isProjectDone(p))),
    [projects.data, only, withDone],
  )
  const stagesOf = (id: string) => (stages.data ?? []).filter((s) => s.project_id === id)
  const stageNames = (id: string) => names(stageOwners.get(id) ?? [])
  const names = (ids: string[]) => ids.map((i) => profiles.get(i)?.nome ?? '?').join(', ') || '—'

  const totals = useMemo(() => {
    const st = list.flatMap((p) => stagesOf(p.id))
    return {
      projetos: list.length,
      etapas: st.length,
      concluidas: st.filter((s) => s.status === 'concluido').length,
      bloqueadas: st.filter((s) => s.bloqueada && s.status !== 'concluido').length,
      atrasados: list.filter((p) => projectOverdue(p)).length,
      previstas: list.reduce((n, p) => n + p.horas_etapas, 0),
      realizadas: list.reduce((n, p) => n + p.horas_realizadas, 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, stages.data])

  function downloadCsv() {
    const head = ['Projeto', 'Prioridade', 'Responsáveis do projeto', 'Prazo do projeto', 'Progresso do projeto (%)', 'Etapa', 'Status', 'Responsável da etapa',
      'Início', 'Prazo', 'Horas previstas', 'Horas realizadas', 'Bloqueada', 'Motivo do bloqueio', 'Risco', 'Explicação']
    const rows: string[][] = []
    for (const p of list) {
      const st = stagesOf(p.id)
      const base = [p.nome, PRIORITY_LABEL[p.prioridade], names(p.responsaveis_ids), p.modo === 'manutencao' ? '' : formatDate(p.prazo), p.modo === 'manutencao' ? 'Em manutenção' : String(p.progresso)]
      if (!st.length) rows.push([...base, '', '', '', '', '', '', '', '', '', '', ''])
      for (const s of st) {
        rows.push([...base, s.nome, ETAPA_STATUS_LABEL[s.status], (stageOwners.get(s.id) ?? []).map((u) => profiles.get(u)?.nome ?? '').join(', '),
          formatDate(s.data_inicio), formatDate(s.prazo), String(s.horas_previstas ?? ''), String(s.horas_realizadas ?? ''),
          s.bloqueada ? 'Sim' : 'Não', s.bloqueio_motivo ?? '', s.risco ? RISCO_LABEL[s.risco] : '', s.descricao ?? ''])
      }
    }
    // ";" e BOM: o Excel em português abre com acentos e colunas certas
    const csv = '﻿' + [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-ti-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const th = 'border-b border-slate-300 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
  const td = 'border-b border-slate-100 px-2 py-1.5 align-top text-xs'

  return (
    <section className="space-y-5">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Para a supervisão</p>
          <h1 className="text-3xl font-bold tracking-tight">Relatório</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost rounded-xl border border-slate-200 dark:border-slate-700" onClick={downloadCsv} disabled={!list.length}><Download size={15} />Baixar Excel (CSV)</button>
          <button className="btn-primary rounded-xl px-4" onClick={() => window.print()} disabled={!list.length}><Printer size={15} />Imprimir / Salvar PDF</button>
        </div>
      </header>

      <div className="no-print card flex flex-wrap items-center gap-4 p-3 text-sm">
        <label className="flex items-center gap-2">Projeto
          <select className="input w-auto" value={only} onChange={(e) => setParams(e.target.value ? { projeto: e.target.value } : {})}>
            <option value="">Todos os projetos</option>
            {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        {!only && <label className="flex items-center gap-2"><input type="checkbox" checked={withDone} onChange={(e) => setWithDone(e.target.checked)} />Incluir concluídos</label>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={withText} onChange={(e) => setWithText(e.target.checked)} />Incluir a explicação de cada etapa</label>
        <span className="ml-auto text-xs text-slate-500">Dica: na tela de impressão, escolha “Salvar como PDF”.</span>
      </div>

      {(projects.isLoading || stages.isLoading) && <div className="skeleton h-64" />}

      {projects.data && (
        <article className="print-sheet rounded-xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" width={40} height={40} />
              <div>
                <h2 className="text-xl font-bold leading-tight">Relatório de projetos da TI</h2>
                <p className="text-xs text-slate-500">BackStage Smart · gerado em {new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</p>
              </div>
            </div>
          </header>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Projetos', String(totals.projetos)], ['Etapas concluídas', `${totals.concluidas} de ${totals.etapas}`],
              ['Atrasados', String(totals.atrasados)], ['Etapas bloqueadas', String(totals.bloqueadas)],
              ['Horas previstas', formatHours(totals.previstas)], ['Horas realizadas', formatHours(totals.realizadas)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-3">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{k}</dt>
                <dd className="text-xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          {!list.length && <p className="mt-6 text-sm text-slate-500">Nenhum projeto para mostrar.</p>}

          {list.length > 1 && (
            <section className="mt-6">
              <h3 className="mb-2 text-sm font-bold">Resumo dos projetos</h3>
              <table className="w-full border-collapse">
                <thead><tr>{['Projeto', 'Prioridade', 'Responsáveis', 'Prazo', 'Etapas', 'Progresso', 'Horas (real./prev.)'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className={`${td} font-medium`}>{p.nome}</td>
                      <td className={td}>{PRIORITY_LABEL[p.prioridade]}</td>
                      <td className={td}>{names(p.responsaveis_ids)}</td>
                      <td className={`${td} ${projectOverdue(p) ? 'font-semibold text-red-600' : ''}`}>{p.modo === 'manutencao' ? '—' : formatDate(p.prazo)}</td>
                      <td className={`${td} tabular-nums`}>{p.etapas_feitas}/{p.etapas_total}</td>
                      <td className={`${td} tabular-nums`}>{p.modo === 'manutencao' ? 'Em manutenção' : `${p.progresso}%`}</td>
                      <td className={`${td} tabular-nums`}>{formatHours(p.horas_realizadas)} / {formatHours(p.horas_etapas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {list.map((p) => {
            const st = stagesOf(p.id)
            return (
              <section key={p.id} className="mt-8 break-inside-avoid-page">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-slate-900 pb-1">
                  <h3 className="text-base font-bold">{p.nome}</h3>
                  <span className="text-xs text-slate-500">{PRIORITY_LABEL[p.prioridade]} · {p.modo === 'manutencao' ? 'em manutenção' : `${p.progresso}% concluído · prazo ${formatDate(p.prazo)}`}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Responsáveis: {names(p.responsaveis_ids)} · Previsão do projeto: {formatHours(p.horas_previstas)}</p>
                {p.situacao_atual && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900"><strong>Situação atual:</strong> {p.situacao_atual}</p>}
                {st.length ? (
                  <table className="mt-3 w-full border-collapse">
                    <thead><tr>{['Etapa', 'Status', 'Responsáveis', 'Início → Prazo', 'Horas (real./prev.)', 'Atenção'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {st.map((s) => (
                        <tr key={s.id} className="break-inside-avoid">
                          <td className={td}>
                            <span className="font-medium">{s.nome}</span>
                            {withText && s.descricao && <p className="mt-1 whitespace-pre-wrap text-[11px] leading-snug text-slate-600">{s.descricao}</p>}
                          </td>
                          <td className={td}>{ETAPA_STATUS_LABEL[s.status]}</td>
                          <td className={td}>{stageNames(s.id)}</td>
                          <td className={`${td} whitespace-nowrap`}>{formatDate(s.data_inicio)} → {formatDate(s.prazo)}</td>
                          <td className={`${td} tabular-nums`}>{formatHours(s.horas_realizadas)} / {formatHours(s.horas_previstas)}</td>
                          <td className={`${td} text-red-700`}>{[s.bloqueada ? `Bloqueada${s.bloqueio_motivo ? `: ${s.bloqueio_motivo}` : ''}` : '', s.risco && s.status !== 'concluido' ? RISCO_LABEL[s.risco] : ''].filter(Boolean).join(' · ') || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="mt-2 text-xs text-slate-500">Sem etapas cadastradas.</p>}
              </section>
            )
          })}
        </article>
      )}
    </section>
  )
}
