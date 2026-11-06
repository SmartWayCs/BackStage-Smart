// API de integração do BackStage Smart.
// Outros programas (e o Claude, pelo terminal) usam uma chave criada na tela "Integrações" para criar projetos e etapas.
// Só a versão em hash da chave fica guardada; a chave em si é mostrada uma única vez.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type, apikey, x-client-info',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const fail = (error: string, status = 400) => json({ ok: false, error }, status)

const STATUS = ['ideia', 'planejamento', 'em_andamento', 'em_pausa', 'concluido']
const PRIORIDADE = ['neutra', 'baixa', 'media', 'alta', 'urgente']
const URGENCIA = ['baixa', 'media', 'alta', 'urgente']
const MODO = ['desenvolvimento', 'manutencao']
const RISCO = ['baixo', 'medio', 'alto']

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail('Use POST com um corpo JSON.', 405)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // 1) Quem está chamando?
  const raw = req.headers.get('x-api-key') ?? req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!raw.startsWith('bsk_')) return fail('Chave ausente ou inválida.', 401)
  const { data: tk } = await db.from('api_tokens').select('id, nome, revoked_at').eq('token_hash', await sha256(raw)).maybeSingle()
  if (!tk || tk.revoked_at) return fail('Chave inválida ou revogada.', 401)
  await db.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tk.id)

  // deno-lint-ignore no-explicit-any
  let b: any
  try { b = await req.json() } catch { return fail('Corpo inválido: envie um JSON.') }

  // Acha o projeto pelo id ou pelo nome (sem diferenciar maiúsculas)
  async function project() {
    if (str(b.project_id)) {
      const { data } = await db.from('projects').select('id, nome').eq('id', b.project_id).maybeSingle()
      return data ? { ok: true as const, p: data } : { ok: false as const, msg: 'Projeto não encontrado (project_id).' }
    }
    const nome = str(b.project_nome)
    if (!nome) return { ok: false as const, msg: 'Informe project_id ou project_nome.' }
    const { data } = await db.from('projects').select('id, nome')
    const hit = (data ?? []).filter((p) => p.nome.toLowerCase() === nome.toLowerCase())
    if (hit.length === 1) return { ok: true as const, p: hit[0]! }
    if (hit.length > 1) return { ok: false as const, msg: 'Há mais de um projeto com esse nome. Use project_id.' }
    return { ok: false as const, msg: `Projeto “${nome}” não encontrado. Use list_projects para ver os nomes.` }
  }

  async function nextPos(projectId: string) {
    const { data } = await db.from('project_stages').select('posicao').eq('project_id', projectId).order('posicao', { ascending: false }).limit(1)
    return (data?.[0]?.posicao ?? 0) + 1000
  }

  function stageFields() {
    const f: Record<string, unknown> = {}
    if (str(b.nome)) f.nome = str(b.nome)
    if (b.descricao !== undefined) f.descricao = str(b.descricao)
    if (b.notas !== undefined) f.notas = str(b.notas)
    if (b.status !== undefined) { if (!STATUS.includes(b.status)) return { err: `status inválido. Use: ${STATUS.join(', ')}` }; f.status = b.status }
    if (b.horas_previstas !== undefined) f.horas_previstas = num(b.horas_previstas)
    if (b.horas_realizadas !== undefined) f.horas_realizadas = num(b.horas_realizadas)
    if (b.data_inicio !== undefined) f.data_inicio = date(b.data_inicio)
    if (b.prazo !== undefined) f.prazo = date(b.prazo)
    if (b.bloqueada !== undefined) f.bloqueada = Boolean(b.bloqueada)
    if (b.bloqueio_motivo !== undefined) f.bloqueio_motivo = str(b.bloqueio_motivo)
    if (b.risco !== undefined) { if (b.risco !== null && !RISCO.includes(b.risco)) return { err: `risco inválido. Use: ${RISCO.join(', ')}` }; f.risco = b.risco }
    return { f }
  }

  switch (b.action) {
    case 'list_projects': {
      const { data, error } = await db.from('projects_with_progress').select('id, nome, modo, prioridade, prazo, etapas_total, etapas_feitas, progresso').order('created_at', { ascending: false })
      if (error) return fail(error.message, 500)
      return json({ ok: true, projects: data })
    }

    case 'list_stages': {
      const r = await project()
      if (!r.ok) return fail(r.msg)
      const { data, error } = await db.from('project_stages').select('id, nome, status, prazo, horas_previstas, horas_realizadas, bloqueada').eq('project_id', r.p.id).order('posicao')
      if (error) return fail(error.message, 500)
      return json({ ok: true, project: r.p, stages: data })
    }

    case 'create_project': {
      const nome = str(b.nome)
      if (!nome) return fail('Informe o nome do projeto.')
      const prioridade = b.prioridade ?? 'media'
      const modo = b.modo ?? 'desenvolvimento'
      if (!PRIORIDADE.includes(prioridade)) return fail(`prioridade inválida. Use: ${PRIORIDADE.join(', ')}`)
      if (!MODO.includes(modo)) return fail(`modo inválido. Use: ${MODO.join(', ')}`)
      const { data: p, error } = await db.from('projects').insert({
        nome, descricao: str(b.descricao), prioridade, modo, prazo: date(b.prazo), data_inicio: date(b.data_inicio),
        horas_previstas: num(b.horas_previstas), tags: Array.isArray(b.tags) ? b.tags.filter((t: unknown) => typeof t === 'string') : [],
      }).select('id, nome').single()
      if (error) return fail(error.message, 500)
      // etapas iniciais, se vierem
      const etapas = Array.isArray(b.etapas) ? b.etapas : []
      let pos = 0
      for (const e of etapas) {
        const nomeE = str(e?.nome)
        if (!nomeE) continue
        pos += 1000
        await db.from('project_stages').insert({
          project_id: p.id, nome: nomeE, posicao: pos, descricao: str(e.descricao), horas_previstas: num(e.horas_previstas),
          status: STATUS.includes(e.status) ? e.status : 'planejamento',
        })
      }
      return json({ ok: true, project: p, etapas_criadas: etapas.filter((e: { nome?: unknown }) => str(e?.nome)).length }, 201)
    }

    case 'create_stage': {
      const r = await project()
      if (!r.ok) return fail(r.msg)
      if (!str(b.nome)) return fail('Informe o nome da etapa (nome).')
      const parsed = stageFields()
      if ('err' in parsed) return fail(parsed.err!)
      const { data, error } = await db.from('project_stages')
        .insert({ status: 'planejamento', ...parsed.f, project_id: r.p.id, posicao: await nextPos(r.p.id) }).select('id, nome, status').single()
      if (error) return fail(error.message, 500)
      return json({ ok: true, project: r.p, stage: data }, 201)
    }

    case 'update_stage': {
      if (!str(b.stage_id)) return fail('Informe stage_id (veja list_stages).')
      const parsed = stageFields()
      if ('err' in parsed) return fail(parsed.err!)
      if (!Object.keys(parsed.f!).length) return fail('Nada para atualizar.')
      const { data, error } = await db.from('project_stages').update(parsed.f!).eq('id', b.stage_id).select('id, nome, status').maybeSingle()
      if (error) return fail(error.message, 500)
      if (!data) return fail('Etapa não encontrada.', 404)
      return json({ ok: true, stage: data })
    }

    case 'create_request': {
      const titulo = str(b.titulo)
      if (!titulo) return fail('Informe o titulo do pedido.')
      const urgencia = b.urgencia ?? 'media'
      if (!URGENCIA.includes(urgencia)) return fail(`urgencia inválida. Use: ${URGENCIA.join(', ')}`)
      let solicitante: string | null = null
      if (str(b.solicitante_email)) {
        const { data } = await db.from('profiles').select('id').eq('email', String(b.solicitante_email).toLowerCase()).maybeSingle()
        solicitante = data?.id ?? null
      }
      const origem = `\n\n(Enviado pela integração “${tk.nome}”)`
      const { data, error } = await db.from('requests').insert({
        titulo, setor: str(b.setor), urgencia, solicitante_id: solicitante, descricao: (str(b.descricao) ?? '') + origem,
      }).select('id, titulo').single()
      if (error) return fail(error.message, 500)
      return json({ ok: true, request: data }, 201)
    }

    default:
      return fail('action desconhecida. Use: list_projects, list_stages, create_project, create_stage, update_stage, create_request.')
  }
})
