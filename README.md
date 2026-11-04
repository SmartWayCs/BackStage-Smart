# BackStage Smart

App interno da TI (estilo Trello) — React + TS + Vite + Tailwind + Supabase.

## Setup
1. `npm install`
2. Crie um projeto no Supabase e rode, em ordem, os arquivos `0001` a `0007` de `supabase/migrations/` no SQL Editor
   (ou `supabase db push` com a CLI). O `0005` cria o bucket privado `attachments` e o `0007` liga o Realtime.
3. `cp .env.example .env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Crie usuários em Authentication → Users. Promova o primeiro admin no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu@email.com';
   ```
5. `npm run dev`

Perfis: `ti` (edita), `supervisao` (lê e comenta), `admin` (gerencia usuários).
Novos usuários nascem como `supervisao`.

## Estrutura
- `supabase/migrations/` — schema, RLS, triggers de histórico, storage, view de progresso, RPC, realtime
- `src/features/` — `auth`, `projects` (kanban/lista), `project-detail`, `dashboard`, `admin`, `realtime`
- Tipos: `npm run gen:types` (requer Supabase CLI linkada) substitui `src/types/database.types.ts`

## Notas
- O histórico (`activity_log`) só é escrito por triggers; o cliente não tem permissão de escrita.
- Anexos: até 10 MB, bucket privado, download por URL assinada de 60 s.
- Menções: `@Nome Completo` no comentário; os IDs ficam em `comments.mencoes`.
