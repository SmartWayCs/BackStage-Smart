# BackStage Smart

App interno da TI (estilo Trello) — React + TS + Vite + Tailwind + Supabase.

## Setup
1. `npm install`
2. Crie um projeto no Supabase e rode, em ordem, os arquivos `0001` a `0020` de `supabase/migrations/` no SQL Editor
   (ou `supabase db push` com a CLI). O `0005` cria o bucket privado `attachments` e o `0007` liga o Realtime.
3. `cp .env.example .env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Crie usuários em Authentication → Users. Promova o primeiro admin no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu@email.com';
   ```
5. `npm run dev`

Login: aceita **e-mail ou nome de usuário** (função `login_email`).
Perfis: `ti` (edita), `supervisao` (lê e comenta), `admin` (gerencia usuários).
Novos usuários nascem como `supervisao`.

## Gestão de usuários pelo app (Edge Function)
A tela **Usuários** (admin) cria, edita e redefine senhas pela função `supabase/functions/admin-users`, que usa a
service role no servidor — essa chave nunca vai para o navegador. Publique uma vez:
- **Painel:** Edge Functions → Deploy a new function → nome `admin-users` → cole `supabase/functions/admin-users/index.ts`
  → Deploy → nas configurações da função, desligue **Verify JWT** (a função já valida o token e exige perfil admin).
- **CLI:** `supabase functions deploy admin-users --no-verify-jwt`

Quem é criado ou tem a senha redefinida é obrigado a trocar a senha no primeiro acesso (`profiles.must_change_password`).

## Etapas
Cada projeto tem etapas: cada etapa é um card com nome livre, **tag de status** (Ideia, Planejamento, Em andamento, Em pausa, Concluído),
explicação, responsável, horas previstas/realizadas, datas e imagens. O progresso do projeto é a fatia de etapas concluídas.

## Telas
- **Projetos**: grade de projetos; dentro de cada um, abas **Etapas** (cards com tag de status), **Planejamento**, **Cronograma** (Gantt), Ideias, Comentários, Anexos e Histórico.
- **Minhas etapas**: o que está com cada pessoa, por urgência (atrasadas, bloqueadas, próximos 7 dias…).
- **Cronograma**: todos os projetos e etapas numa linha do tempo.
- **Relatório**: imprime/salva em PDF ou baixa em CSV (abre no Excel), do portfólio todo ou de um projeto.
- **Bloqueios e riscos** nas etapas, com destaque no dashboard.
- **App instalável (PWA)**: precisa estar publicado em HTTPS; no celular, "Adicionar à tela de início". Há `vercel.json` pronto para a Vercel.

## Mais telas
- **Pedidos**: o admin abre escolhendo a urgência; a TI analisa, aprova definindo o prazo (com horário opcional), recusa (com justificativa) ou transforma em projeto. A integração `create_request` continua criando pedidos.
- **Quadro**: etapas de todos os projetos por status (arraste para mudar o status).
- **Calendário**: prazos do mês e exportação `.ics` para Google Agenda/Outlook.
- **Modo TV** (`/tv`): painéis que trocam sozinhos (setas, espaço pausa, Esc sai).
- **Notas** (texto formatado) no projeto e em cada etapa.

## Integrações (API para outros programas e para o Claude)
Admin → Mais → **Integrações**: cria chaves (`bsk_…`, mostradas uma vez; só o hash fica no banco).
A API é a Edge Function `integration-api` (publique como a `admin-users`, com **Verify JWT desligado**):
`POST /functions/v1/integration-api` com `x-api-key` e um JSON `{ "action": ... }`
(`list_projects`, `list_stages`, `create_project`, `create_stage`, `update_stage`, `create_request`).

## Estrutura
- `supabase/migrations/` — schema, RLS, triggers de histórico, storage, view de progresso, RPC, realtime
- `src/features/` — `auth`, `projects` (kanban/lista), `project-detail`, `dashboard`, `admin`, `realtime`
- Tipos: `npm run gen:types` (requer Supabase CLI linkada) substitui `src/types/database.types.ts`

## Notas
- O histórico (`activity_log`) só é escrito por triggers; o cliente não tem permissão de escrita.
- Anexos: até 10 MB, bucket privado, download por URL assinada de 60 s.
- Menções: `@Nome Completo` no comentário; os IDs ficam em `comments.mencoes`.
