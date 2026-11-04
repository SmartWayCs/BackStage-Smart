import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// Placeholders evitam crash na inicialização; a UI mostra aviso de configuração.
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  key ?? 'missing-anon-key',
)
