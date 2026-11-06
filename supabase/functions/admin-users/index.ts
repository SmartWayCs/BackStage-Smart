// Edge Function: gestão de usuários pelo admin (criar, editar, redefinir senha).
// Roda no servidor do Supabase com a service role (que nunca vai para o navegador)
// e só aceita chamadas de quem é admin.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const fail = (error: string, status = 400) => json({ error }, status)

const ROLES = ['ti', 'supervisao', 'admin']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME = /^[a-z0-9._-]{3,30}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return fail('Método não permitido', 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // 1) Quem está chamando? Precisa ser admin.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return fail('Não autenticado', 401)
  const { data: caller, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !caller.user) return fail('Sessão inválida', 401)
  const { data: me } = await admin.from('profiles').select('role').eq('id', caller.user.id).single()
  if (me?.role !== 'admin') return fail('Apenas administradores podem gerenciar usuários', 403)

  // 2) O que ele quer fazer?
  // deno-lint-ignore no-explicit-any
  let body: any
  try { body = await req.json() } catch { return fail('Corpo inválido') }

  const usernameTaken = async (username: string, exceptId?: string) => {
    let q = admin.from('profiles').select('id').eq('username', username)
    if (exceptId) q = q.neq('id', exceptId)
    const { data } = await q.maybeSingle()
    return Boolean(data)
  }

  // ---------- criar ----------
  if (body.action === 'create') {
    const nome = String(body.nome ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const username = String(body.username ?? '').trim().toLowerCase()
    const senha = String(body.senha ?? '')
    const role = String(body.role ?? 'supervisao')
    if (!nome) return fail('Informe o nome')
    if (!EMAIL.test(email)) return fail('E-mail inválido')
    if (!USERNAME.test(username)) return fail('Usuário inválido: use de 3 a 30 letras minúsculas, números, ponto, hífen ou _')
    if (await usernameTaken(username)) return fail('Esse nome de usuário já está em uso')
    if (senha.length < 8) return fail('A senha precisa ter ao menos 8 caracteres')
    if (!ROLES.includes(role)) return fail('Perfil inválido')

    const { data, error } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true, user_metadata: { nome, username },
    })
    if (error) return fail(/already|registered|exists/i.test(error.message) ? 'Já existe um usuário com esse e-mail' : error.message)

    // O trigger cria o profile; aqui ajustamos perfil e exigimos a troca de senha no 1º acesso
    const { error: upErr } = await admin.from('profiles')
      .update({ role, nome, username, must_change_password: true }).eq('id', data.user.id)
    if (upErr) return fail(upErr.message, 500)
    return json({ id: data.user.id })
  }

  // ---------- editar ----------
  if (body.action === 'update') {
    const id = String(body.id ?? '')
    const nome = String(body.nome ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const username = String(body.username ?? '').trim().toLowerCase()
    const role = String(body.role ?? '')
    if (!id) return fail('Usuário não informado')
    if (!nome) return fail('Informe o nome')
    if (!EMAIL.test(email)) return fail('E-mail inválido')
    if (!USERNAME.test(username)) return fail('Usuário inválido: use de 3 a 30 letras minúsculas, números, ponto, hífen ou _')
    if (!ROLES.includes(role)) return fail('Perfil inválido')
    if (id === caller.user.id && role !== 'admin') return fail('Você não pode remover o seu próprio acesso de administrador')
    if (await usernameTaken(username, id)) return fail('Esse nome de usuário já está em uso')

    const { error } = await admin.auth.admin.updateUserById(id, {
      email, email_confirm: true, user_metadata: { nome, username },
    })
    if (error) return fail(/already|registered|exists/i.test(error.message) ? 'Já existe um usuário com esse e-mail' : error.message)

    const { error: upErr } = await admin.from('profiles').update({ nome, username, email, role }).eq('id', id)
    if (upErr) return fail(upErr.message, 500)
    return json({ id })
  }

  // ---------- redefinir senha ----------
  if (body.action === 'reset_password') {
    const id = String(body.id ?? '')
    const senha = String(body.senha ?? '')
    if (!id) return fail('Usuário não informado')
    if (senha.length < 8) return fail('A senha precisa ter ao menos 8 caracteres')

    const { error } = await admin.auth.admin.updateUserById(id, { password: senha })
    if (error) return fail(error.message)
    // A pessoa precisa escolher a própria senha no próximo acesso
    const { error: upErr } = await admin.from('profiles').update({ must_change_password: true }).eq('id', id)
    if (upErr) return fail(upErr.message, 500)
    return json({ id })
  }

  return fail('Ação desconhecida')
})
