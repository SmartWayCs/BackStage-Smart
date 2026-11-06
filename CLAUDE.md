# BackStage Smart

App interno da TI (estilo Trello) para acompanhar projetos. UI e domínio em português.

## Stack
React 19 + TypeScript + Vite + Tailwind 3 · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions/Deno) · TanStack Query · react-router 7 · recharts (lazy) · dnd-kit · deploy na Vercel (`vercel.json`, PWA com `public/sw.js`).
Alias `@/` aponta para `src/`.

## Comandos
- `npm run dev` · `npm run build` (tsc -b + vite) · `npm run typecheck`
- `npm run gen:types` — regenera `src/types/database.types.ts` (precisa da Supabase CLI linkada)
- Env: `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ignorado pelo git)

## Modelo de domínio
- **Projeto** → tem **etapas** (`project_stages`). A etapa é o card: nome livre + tag de status (`ideia, planejamento, em_andamento, em_pausa, concluido`), responsáveis (vários), horas previstas/realizadas, datas, bloqueio, risco, notas, imagens.
- Progresso do projeto = etapas concluídas / total (view `projects_with_progress`).
- O modelo antigo (`tasks`, status no projeto, kanban de projetos) foi removido nas migrations 0011–0013. Não reintroduzir.
- Outros: ideias (viram etapas via `convert_idea_to_stage`), comentários com `@menções`, anexos (bucket privado, 10 MB, URL assinada 60 s), pedidos à TI (novo → análise → aprovado/recusado/virou projeto), notas em Markdown, projeto em modo desenvolvimento/manutenção.
- Histórico (`activity_log`) é escrito **só por triggers**; o cliente não escreve.

## Perfis (RLS em `supabase/migrations`)
`supervisao` (lê e comenta; padrão de novos usuários) · `ti` (edita) · `admin` (gerencia usuários e integrações). Login por e-mail **ou** usuário (`login_email`). Usuário criado/redefinido troca a senha no 1º acesso (`must_change_password`).

## Estrutura
- `src/features/`: `auth`, `projects` (lista, quadro, calendário, Gantt, relatório, minhas etapas), `project-detail` (abas Etapas/Planejamento/Cronograma/Ideias/Comentários/Anexos/Notas/Histórico), `dashboard`, `requests`, `tv` (`/tv`), `admin`, `integrations`, `notes`, `realtime`
- `src/components/` (AppLayout, Gantt, Markdown, `ui/`), `src/hooks/`, `src/lib/constants.ts` (labels/cores de status, prioridade, risco)
- `supabase/migrations/0001–0018` em ordem; `supabase/setup_completo.sql` = tudo junto
- Edge Functions (publicar com **Verify JWT desligado**, elas validam por conta própria):
  - `admin-users`: cria/edita/redefine senha (usa service role; só admin)
  - `integration-api`: `POST /functions/v1/integration-api` com `x-api-key: bsk_…` e `{ "action": ... }` — `list_projects, list_stages, create_project, create_stage, update_stage, create_request`. Só o hash SHA-256 da chave fica no banco (`api_tokens`).

## Convenções
- Textos de UI, mensagens de erro e nomes de colunas em português.
- Nova mudança de banco = nova migration numerada (0019…) **e** atualizar `setup_completo.sql` e `database.types.ts`.
- Nunca expor a service role no front. Nunca commitar `.env` nem chaves `bsk_…` (o token do Claude fica em `$BACKSTAGE_TOKEN` no `~/.zshrc`).

## Pendências conhecidas
- Quase todo o código está sem commit (só existe o commit inicial `ff050f6`); commitar.
- A seção "Estrutura" do README ainda cita "kanban"; atualizar.
