// Tipos alinhados ao schema das migrations 0001-0002.
// Depois de criar o projeto Supabase, regenere com: npm run gen:types

export type UserRole = 'ti' | 'supervisao' | 'admin'
export type ProjectStatus = 'ideia' | 'planejamento' | 'em_andamento' | 'em_pausa' | 'concluido'
export type Priority = 'baixa' | 'media' | 'alta' | 'urgente'
export type TaskStatus = 'a_fazer' | 'fazendo' | 'feito'

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
        id: string; nome: string; email: string; role: UserRole
        avatar_url: string | null; created_at: string
      }, 'id' | 'nome' | 'email'>
      projects: Table<{
        id: string; nome: string; descricao: string | null; status: ProjectStatus
        prioridade: Priority; responsavel_id: string | null; situacao_atual: string | null
        data_inicio: string | null; prazo: string | null; tags: string[]
        posicao: number; created_at: string; updated_at: string
      }, 'nome'>
      tasks: Table<{
        id: string; project_id: string; titulo: string; descricao: string | null
        status: TaskStatus; responsavel_id: string | null; prazo: string | null
        posicao: number; concluida_em: string | null
      }, 'project_id' | 'titulo'>
      ideas: Table<{
        id: string; project_id: string; titulo: string; descricao: string | null
        autor_id: string | null; convertida_em_task_id: string | null; created_at: string
      }, 'project_id' | 'titulo'>
      comments: Table<{
        id: string; project_id: string; autor_id: string; conteudo: string
        mencoes: string[]; created_at: string
      }, 'project_id' | 'autor_id' | 'conteudo'>
      attachments: Table<{
        id: string; project_id: string; arquivo_url: string; nome: string
        enviado_por: string | null; created_at: string
      }, 'project_id' | 'arquivo_url' | 'nome'>
      activity_log: Table<{
        id: string; project_id: string | null; usuario_id: string | null
        acao: string; detalhes: Json; created_at: string
      }, 'acao'>
    }
    Views: {
      projects_with_progress: {
        Row: Database['public']['Tables']['projects']['Row'] & {
          tasks_total: number; tasks_feitas: number; progresso: number
        }
        Relationships: []
      }
    }
    Functions: {
      convert_idea_to_task: { Args: { p_idea_id: string }; Returns: string }
    }
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      priority: Priority
      task_status: TaskStatus
    }
    CompositeTypes: Record<string, never>
  }
}

export type ProjectRow = Database['public']['Views']['projects_with_progress']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Idea = Database['public']['Tables']['ideas']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Attachment = Database['public']['Tables']['attachments']['Row']
export type Activity = Database['public']['Tables']['activity_log']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
