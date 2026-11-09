// Tipos alinhados ao schema das migrations 0001-0002.
// Depois de criar o projeto Supabase, regenere com: npm run gen:types

export type UserRole = 'ti' | 'supervisao' | 'admin'
export type EtapaStatus = 'ideia' | 'planejamento' | 'em_andamento' | 'em_pausa' | 'concluido'
export type PedidoStatus = 'novo' | 'em_analise' | 'aprovado' | 'recusado' | 'convertido'
export type PedidoUrgencia = 'baixa' | 'media' | 'alta' | 'urgente'
export type ProjetoModo = 'desenvolvimento' | 'manutencao'
export type RiscoNivel = 'baixo' | 'medio' | 'alto'
export type Priority = 'neutra' | 'baixa' | 'media' | 'alta' | 'urgente'

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Required extends keyof Row = never> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string; nome: string; email: string; username: string; role: UserRole; must_change_password: boolean
        avatar_url: string | null; created_at: string
      }, 'id' | 'nome' | 'email'>
      projects: Table<{
        id: string; nome: string; descricao: string | null
        prioridade: Priority; situacao_atual: string | null
        data_inicio: string | null; prazo: string | null; tags: string[]; horas_previstas: number | null; notas: string | null; modo: ProjetoModo
        created_at: string; updated_at: string
      }, 'nome'>
      project_stages: Table<{
        id: string; project_id: string; nome: string; posicao: number; status: EtapaStatus; descricao: string | null
        horas_previstas: number | null; horas_realizadas: number | null
        data_inicio: string | null; prazo: string | null; concluida_em: string | null; created_at: string
        bloqueada: boolean; bloqueio_motivo: string | null; risco: RiscoNivel | null; notas: string | null
      }, 'project_id' | 'nome'>
      api_tokens: Table<{
        id: string; nome: string; prefixo: string; token_hash: string; criado_por: string | null
        created_at: string; last_used_at: string | null; revoked_at: string | null
      }, 'nome' | 'prefixo' | 'token_hash'>
      requests: Table<{
        id: string; titulo: string; descricao: string | null; setor: string | null; urgencia: PedidoUrgencia
        status: PedidoStatus; solicitante_id: string | null; resposta: string | null; decidido_por: string | null
        decidido_em: string | null; project_id: string | null; prazo: string | null; prazo_hora: string | null; created_at: string
      }, 'titulo' | 'urgencia'>
      stage_members: Table<{
        stage_id: string; user_id: string; created_at: string
      }, 'stage_id' | 'user_id'>
      project_members: Table<{
        project_id: string; user_id: string; created_at: string
      }, 'project_id' | 'user_id'>
      ideas: Table<{
        id: string; project_id: string; titulo: string; descricao: string | null
        autor_id: string | null; convertida_em_stage_id: string | null; created_at: string
      }, 'project_id' | 'titulo'>
      comments: Table<{
        id: string; project_id: string; autor_id: string; conteudo: string
        mencoes: string[]; created_at: string
      }, 'project_id' | 'autor_id' | 'conteudo'>
      attachments: Table<{
        id: string; project_id: string; arquivo_url: string; nome: string
        enviado_por: string | null; stage_id: string | null; created_at: string
      }, 'project_id' | 'arquivo_url' | 'nome'>
      activity_log: Table<{
        id: string; project_id: string | null; usuario_id: string | null
        acao: string; detalhes: Json; created_at: string
      }, 'acao'>
    }
    Views: {
      projects_with_progress: {
        Row: Omit<Database['public']['Tables']['projects']['Row'], 'notas'> & {
          etapas_total: number; etapas_feitas: number; progresso: number
          responsaveis_ids: string[]
          horas_etapas: number; horas_realizadas: number
        }
        Relationships: []
      }
    }
    Functions: {
      convert_request_to_project: { Args: { p_request_id: string }; Returns: string }
      convert_idea_to_stage: { Args: { p_idea_id: string }; Returns: string }
      complete_password_change: { Args: Record<PropertyKey, never>; Returns: undefined }
      login_email: { Args: { p_identifier: string }; Returns: string | null }
    }
    Enums: {
      user_role: UserRole
      priority: Priority
      etapa_status: EtapaStatus
      risco_nivel: RiscoNivel
      projeto_modo: ProjetoModo
      pedido_status: PedidoStatus
      pedido_urgencia: PedidoUrgencia
    }
    CompositeTypes: Record<string, never>
  }
}

export type ProjectRow = Database['public']['Views']['projects_with_progress']['Row']
export type Stage = Database['public']['Tables']['project_stages']['Row']
export type PedidoRow = Database['public']['Tables']['requests']['Row']
export type Idea = Database['public']['Tables']['ideas']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Attachment = Database['public']['Tables']['attachments']['Row']
export type Activity = Database['public']['Tables']['activity_log']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
