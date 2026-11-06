import { supabase } from '@/lib/supabase'

/** Chama a Edge Function `admin-users` (criar, editar, redefinir senha). Só funciona para admin. */
export async function adminUsers<T = { id: string }>(action: 'create' | 'update' | 'reset_password', payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } })
  if (error) {
    const ctx = (error as { context?: unknown }).context
    if (ctx instanceof Response) {
      // O servidor respondeu com erro: a mensagem útil vem no corpo
      if (ctx.status === 404) throw new Error('A função “admin-users” ainda não foi publicada no Supabase. Veja o passo a passo no README.')
      const body = await ctx.json().catch(() => null)
      throw new Error(body?.error ?? error.message)
    }
    // Sem resposta (rede/CORS): normalmente a função não existe ou o “Verify JWT” está ligado
    throw new Error('Não consegui chamar a função “admin-users”. Confirme que ela foi publicada e que o “Verify JWT” está desligado.')
  }
  return data as T
}

/** Senha aleatória de 12 caracteres, sem símbolos ambíguos (0/O, 1/l/I). */
export function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export const toUsername = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)
