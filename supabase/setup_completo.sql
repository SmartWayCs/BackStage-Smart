-- 0001: enums, profiles, helpers

create type user_role      as enum ('ti', 'supervisao', 'admin');
create type project_status as enum ('ideia', 'planejamento', 'em_andamento', 'em_pausa', 'concluido');
create type priority       as enum ('baixa', 'media', 'alta', 'urgente');
create type task_status    as enum ('a_fazer', 'fazendo', 'feito');

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  nome        text not null,
  email       text not null,
  role        user_role not null default 'supervisao',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Papel do usuário logado. Usado em todas as policies.
-- SECURITY DEFINER evita recursão de RLS ao consultar profiles.
-- (Nome app_role porque current_role é palavra reservada do Postgres.)
create or replace function public.app_role()
returns user_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

-- Cria o profile automaticamente quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
-- 0002: tabelas principais

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  descricao       text,
  status          project_status not null default 'ideia',
  prioridade      priority not null default 'media',
  responsavel_id  uuid references public.profiles(id) on delete set null,
  situacao_atual  text,
  data_inicio     date,
  prazo           date,
  tags            text[] not null default '{}',
  posicao         double precision not null default 0, -- ordem dentro da coluna
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  status          task_status not null default 'a_fazer',
  responsavel_id  uuid references public.profiles(id) on delete set null,
  prazo           date,
  posicao         double precision not null default 0,
  concluida_em    timestamptz
);

create table public.ideas (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references public.projects(id) on delete cascade,
  titulo                 text not null,
  descricao              text,
  autor_id               uuid references public.profiles(id) on delete set null,
  convertida_em_task_id  uuid references public.tasks(id) on delete set null,
  created_at             timestamptz not null default now()
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  autor_id    uuid not null references public.profiles(id),
  conteudo    text not null,
  mencoes     uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  arquivo_url  text not null,  -- caminho no bucket 'attachments'
  nome         text not null,
  enviado_por  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  usuario_id  uuid references public.profiles(id) on delete set null,
  acao        text not null,
  detalhes    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index tasks_project_status_idx on public.tasks (project_id, status, posicao);
create index projects_status_idx      on public.projects (status, posicao);
create index ideas_project_idx        on public.ideas (project_id);
create index comments_project_idx     on public.comments (project_id, created_at);
create index attachments_project_idx  on public.attachments (project_id);
create index activity_project_idx     on public.activity_log (project_id, created_at desc);
-- 0003: Row Level Security em todas as tabelas

alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.tasks        enable row level security;
alter table public.ideas        enable row level security;
alter table public.comments     enable row level security;
alter table public.attachments  enable row level security;
alter table public.activity_log enable row level security;

-- Leitura: todo usuário autenticado lê tudo
create policy read_all on public.profiles     for select to authenticated using (true);
create policy read_all on public.projects     for select to authenticated using (true);
create policy read_all on public.tasks        for select to authenticated using (true);
create policy read_all on public.ideas        for select to authenticated using (true);
create policy read_all on public.comments     for select to authenticated using (true);
create policy read_all on public.attachments  for select to authenticated using (true);
create policy read_all on public.activity_log for select to authenticated using (true);

-- Escrita: somente ti e admin (projects, tasks, ideas, attachments)
create policy ti_insert on public.projects for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.projects for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.projects for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

create policy ti_insert on public.tasks for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.tasks for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.tasks for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

create policy ti_insert on public.ideas for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.ideas for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.ideas for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

create policy ti_insert on public.attachments for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.attachments for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.attachments for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

-- Comentários: qualquer autenticado comenta como si mesmo;
-- só o autor ou admin edita/exclui.
create policy c_insert on public.comments for insert to authenticated
  with check (autor_id = auth.uid());
create policy c_update on public.comments for update to authenticated
  using (autor_id = auth.uid() or public.app_role() = 'admin')
  with check (autor_id = auth.uid() or public.app_role() = 'admin');
create policy c_delete on public.comments for delete to authenticated
  using (autor_id = auth.uid() or public.app_role() = 'admin');

-- activity_log: nenhuma policy de escrita. Só triggers SECURITY DEFINER (0004).

-- Profiles: cada um edita o próprio registro; admin edita qualquer um.
-- Não há INSERT/DELETE pelo cliente (insert vem do trigger de signup).
create policy p_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.app_role() = 'admin')
  with check (id = auth.uid() or public.app_role() = 'admin');

-- Trava de escalonamento: só admin altera role.
-- auth.uid() nulo = SQL Editor / service role (permite promover o 1º admin).
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and public.app_role() <> 'admin' then
    raise exception 'Apenas administradores podem alterar o perfil de acesso';
  end if;
  return new;
end $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();
-- 0004: triggers que preenchem activity_log (única forma de escrita nessa tabela)

create or replace function public.log_activity(p_project uuid, p_acao text, p_detalhes jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log (project_id, usuario_id, acao, detalhes)
  values (p_project, auth.uid(), p_acao, p_detalhes);
$$;
-- Não pode ser chamada pelo cliente via RPC
revoke all on function public.log_activity(uuid, text, jsonb) from public, anon, authenticated;

-- tasks.concluida_em automático
create or replace function public.tasks_set_concluida()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'feito' then new.concluida_em := coalesce(new.concluida_em, now());
    else new.concluida_em := null; end if;
  elsif new.status = 'feito' and old.status <> 'feito' then
    new.concluida_em := now();
  elsif new.status <> 'feito' then
    new.concluida_em := null;
  end if;
  return new;
end $$;
create trigger tasks_concluida before insert or update on public.tasks
  for each row execute function public.tasks_set_concluida();

-- projects
create or replace function public.log_project_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.id, 'projeto_criado', jsonb_build_object('nome', new.nome));
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.log_activity(new.id, 'status_alterado', jsonb_build_object('de', old.status, 'para', new.status));
  end if;
  if new.situacao_atual is distinct from old.situacao_atual then
    perform public.log_activity(new.id, 'situacao_atualizada', jsonb_build_object('texto', new.situacao_atual));
  end if;
  if new.responsavel_id is distinct from old.responsavel_id then
    perform public.log_activity(new.id, 'responsavel_alterado', jsonb_build_object('de', old.responsavel_id, 'para', new.responsavel_id));
  end if;
  if new.prioridade is distinct from old.prioridade then
    perform public.log_activity(new.id, 'prioridade_alterada', jsonb_build_object('de', old.prioridade, 'para', new.prioridade));
  end if;
  if new.prazo is distinct from old.prazo then
    perform public.log_activity(new.id, 'prazo_alterado', jsonb_build_object('de', old.prazo, 'para', new.prazo));
  end if;
  return new;
end $$;
create trigger projects_log after insert or update on public.projects
  for each row execute function public.log_project_changes();

-- tasks
create or replace function public.log_task_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'tarefa_criada', jsonb_build_object('titulo', new.titulo, 'task_id', new.id));
  elsif new.status is distinct from old.status then
    perform public.log_activity(
      new.project_id,
      case when new.status = 'feito' then 'tarefa_concluida' else 'tarefa_movida' end,
      jsonb_build_object('titulo', new.titulo, 'task_id', new.id, 'para', new.status));
  end if;
  return new;
end $$;
create trigger tasks_log after insert or update on public.tasks
  for each row execute function public.log_task_changes();

-- comments
create or replace function public.log_comment_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.project_id, 'comentario_adicionado',
    jsonb_build_object('trecho', left(new.conteudo, 140), 'comment_id', new.id));
  return new;
end $$;
create trigger comments_log after insert on public.comments
  for each row execute function public.log_comment_added();

-- ideas
create or replace function public.log_idea_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'ideia_criada', jsonb_build_object('titulo', new.titulo));
  elsif old.convertida_em_task_id is null and new.convertida_em_task_id is not null then
    perform public.log_activity(new.project_id, 'ideia_convertida',
      jsonb_build_object('titulo', new.titulo, 'task_id', new.convertida_em_task_id));
  end if;
  return new;
end $$;
create trigger ideas_log after insert or update on public.ideas
  for each row execute function public.log_idea_changes();

-- attachments
create or replace function public.log_attachment_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.project_id, 'anexo_adicionado', jsonb_build_object('nome', new.nome));
  return new;
end $$;
create trigger attachments_log after insert on public.attachments
  for each row execute function public.log_attachment_added();
-- 0005: bucket privado de anexos (limite 10 MB). Path: {project_id}/{uuid}-{nome}

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.app_role() in ('ti', 'admin'));
create policy attachments_update on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and public.app_role() in ('ti', 'admin'));
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.app_role() in ('ti', 'admin'));
-- 0006: progresso dos projetos e conversão de ideia em tarefa

-- security_invoker: a view respeita o RLS de quem consulta
create or replace view public.projects_with_progress
with (security_invoker = true) as
select
  p.*,
  coalesce(t.total, 0)::int  as tasks_total,
  coalesce(t.feitas, 0)::int as tasks_feitas,
  case when coalesce(t.total, 0) = 0 then 0
       else round(100.0 * t.feitas / t.total)::int end as progresso
from public.projects p
left join lateral (
  select count(*) as total, count(*) filter (where status = 'feito') as feitas
  from public.tasks where project_id = p.id
) t on true;

-- security invoker: o RLS barra quem não é ti/admin
create or replace function public.convert_idea_to_task(p_idea_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_idea public.ideas;
  v_task uuid;
begin
  select * into v_idea from public.ideas where id = p_idea_id for update;
  if not found then raise exception 'Ideia não encontrada ou sem permissão'; end if;
  if v_idea.convertida_em_task_id is not null then raise exception 'Ideia já convertida'; end if;

  insert into public.tasks (project_id, titulo, descricao, posicao)
  values (
    v_idea.project_id, v_idea.titulo, v_idea.descricao,
    coalesce((select max(posicao) from public.tasks
              where project_id = v_idea.project_id and status = 'a_fazer'), 0) + 1000
  ) returning id into v_task;

  update public.ideas set convertida_em_task_id = v_task where id = p_idea_id;
  return v_task;
end $$;
grant execute on function public.convert_idea_to_task(uuid) to authenticated;
-- 0007: habilita Supabase Realtime nas tabelas usadas pelo app
alter publication supabase_realtime add table
  public.profiles, public.projects, public.tasks, public.ideas,
  public.comments, public.attachments, public.activity_log;
-- 0008: prioridade "neutra" + vários responsáveis por projeto

-- 1) Nova prioridade (fica antes de "baixa" na ordem do enum)
alter type public.priority add value if not exists 'neutra' before 'baixa';

-- 2) Responsáveis: tabela de ligação projeto <-> usuário
create table public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

alter table public.project_members enable row level security;
create policy read_all  on public.project_members for select to authenticated using (true);
create policy ti_insert on public.project_members for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.project_members for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

-- 3) Migra o responsável único atual para a nova tabela
insert into public.project_members (project_id, user_id)
select id, responsavel_id from public.projects where responsavel_id is not null
on conflict do nothing;

-- 4) O log de projeto não olha mais responsavel_id
create or replace function public.log_project_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.id, 'projeto_criado', jsonb_build_object('nome', new.nome));
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.log_activity(new.id, 'status_alterado', jsonb_build_object('de', old.status, 'para', new.status));
  end if;
  if new.situacao_atual is distinct from old.situacao_atual then
    perform public.log_activity(new.id, 'situacao_atualizada', jsonb_build_object('texto', new.situacao_atual));
  end if;
  if new.prioridade is distinct from old.prioridade then
    perform public.log_activity(new.id, 'prioridade_alterada', jsonb_build_object('de', old.prioridade, 'para', new.prioridade));
  end if;
  if new.prazo is distinct from old.prazo then
    perform public.log_activity(new.id, 'prazo_alterado', jsonb_build_object('de', old.prazo, 'para', new.prazo));
  end if;
  return new;
end $$;

-- 5) Remove a coluna antiga (a view depende dela, então é recriada)
drop view public.projects_with_progress;
alter table public.projects drop column responsavel_id;

create view public.projects_with_progress
with (security_invoker = true) as
select
  p.*,
  coalesce(t.total, 0)::int  as tasks_total,
  coalesce(t.feitas, 0)::int as tasks_feitas,
  case when coalesce(t.total, 0) = 0 then 0
       else round(100.0 * t.feitas / t.total)::int end as progresso,
  coalesce(
    (select array_agg(m.user_id) from public.project_members m where m.project_id = p.id),
    '{}'::uuid[]
  ) as responsaveis_ids
from public.projects p
left join lateral (
  select count(*) as total, count(*) filter (where status = 'feito') as feitas
  from public.tasks where project_id = p.id
) t on true;

-- 6) Histórico de responsáveis
create or replace function public.log_member_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'responsavel_adicionado', jsonb_build_object('user_id', new.user_id));
    return new;
  end if;
  -- ao excluir o projeto, os membros somem em cascata: não há onde registrar
  if exists (select 1 from public.projects where id = old.project_id) then
    perform public.log_activity(old.project_id, 'responsavel_removido', jsonb_build_object('user_id', old.user_id));
  end if;
  return old;
end $$;
create trigger project_members_log after insert or delete on public.project_members
  for each row execute function public.log_member_changes();

-- 7) Realtime
alter publication supabase_realtime add table public.project_members;
-- 0009: login por e-mail OU nome de usuário

-- 1) Coluna username (preenchida para quem já existe a partir do e-mail)
alter table public.profiles add column username text;

with base as (
  select id,
         case when length(u) < 3 then u || 'user' else u end as u
  from (
    select id, left(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g'), 26) as u
    from public.profiles
  ) s
), ranked as (
  select id, u, row_number() over (partition by u order by id) as rn from base
)
update public.profiles p
set username = case when r.rn = 1 then r.u else r.u || r.rn end
from ranked r where p.id = r.id;

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9._-]{3,30}$');
create unique index profiles_username_key on public.profiles (username);

-- 2) Novo usuário no Auth: gera o username (do metadata ou do e-mail), sem repetir
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_user text;
  v_n    int := 1;
begin
  v_base := left(regexp_replace(
    lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))),
    '[^a-z0-9._-]', '', 'g'), 26);
  if length(v_base) < 3 then v_base := v_base || 'user'; end if;
  v_user := v_base;
  while exists (select 1 from public.profiles where username = v_user) loop
    v_n := v_n + 1;
    v_user := v_base || v_n;
  end loop;

  insert into public.profiles (id, nome, email, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    v_user
  );
  return new;
end $$;

-- 3) Descobre o e-mail para o login. Se já veio um e-mail, devolve ele mesmo.
--    Pode ser chamada antes do login (anon), por isso só devolve o e-mail do username informado.
create or replace function public.login_email(p_identifier text)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when position('@' in p_identifier) > 0 then lower(trim(p_identifier))
    else (select email from public.profiles where username = lower(trim(p_identifier)))
  end
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;
-- 0010: troca de senha obrigatória no primeiro acesso

alter table public.profiles add column must_change_password boolean not null default false;

-- Trava ampliada: só admin altera perfil de acesso e e-mail;
-- a flag de troca de senha só muda via admin ou via complete_password_change().
-- auth.uid() nulo = SQL Editor / service role (Edge Function), sempre permitido.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.app_role() <> 'admin' then
    if new.role is distinct from old.role then
      raise exception 'Apenas administradores podem alterar o perfil de acesso';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Apenas administradores podem alterar o e-mail';
    end if;
    if new.must_change_password is distinct from old.must_change_password
       and coalesce(current_setting('app.allow_pw_flag', true), '') <> '1' then
      raise exception 'Operação não permitida';
    end if;
  end if;
  return new;
end $$;

-- Chamada pelo próprio usuário logo depois de trocar a senha com sucesso.
create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_pw_flag', '1', true);  -- vale só nesta transação
  update public.profiles set must_change_password = false where id = auth.uid();
end $$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;
-- 0011: etapas personalizáveis DENTRO de cada projeto
-- Antes: o projeto tinha um status e era um card em cada coluna.
-- Agora: o projeto tem as próprias etapas (colunas) e as tarefas andam por elas.

-- 1) Etapas do projeto
create table public.project_stages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  nome        text not null check (length(trim(nome)) > 0),
  posicao     double precision not null default 0,
  is_done     boolean not null default false,   -- tarefas nesta etapa contam como concluídas
  created_at  timestamptz not null default now()
);
create index project_stages_project_idx on public.project_stages (project_id, posicao);

alter table public.project_stages enable row level security;
create policy read_all  on public.project_stages for select to authenticated using (true);
create policy ti_insert on public.project_stages for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.project_stages for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.project_stages for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

-- 2) Etapas padrão de todo projeto novo (depois dá para renomear, criar e excluir)
create or replace function public.seed_project_stages(p_project uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.project_stages (project_id, nome, posicao, is_done) values
    (p_project, 'Ideia',        1000, false),
    (p_project, 'Planejamento', 2000, false),
    (p_project, 'Em andamento', 3000, false),
    (p_project, 'Em pausa',     4000, false),
    (p_project, 'Concluído',    5000, true);
$$;
revoke all on function public.seed_project_stages(uuid) from public, anon, authenticated;

create or replace function public.projects_seed_stages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_project_stages(new.id);
  return new;
end $$;
create trigger projects_seed after insert on public.projects
  for each row execute function public.projects_seed_stages();

-- projetos que já existem ganham as etapas padrão
select public.seed_project_stages(id) from public.projects;

-- 3) Tarefas passam a apontar para uma etapa
alter table public.tasks add column stage_id uuid references public.project_stages(id) on delete restrict;

update public.tasks t set stage_id = s.id
from public.project_stages s
where s.project_id = t.project_id
  and s.nome = case t.status::text
                 when 'a_fazer' then 'Planejamento'
                 when 'fazendo' then 'Em andamento'
                 else 'Concluído'
               end;

alter table public.tasks alter column stage_id set not null;
create index tasks_stage_idx on public.tasks (project_id, stage_id, posicao);

-- 4) Funções e triggers sem a coluna status (antes de removê-la)
create or replace function public.tasks_set_concluida()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_done boolean;
begin
  select is_done into v_done from public.project_stages where id = new.stage_id;
  if coalesce(v_done, false) then
    new.concluida_em := coalesce(new.concluida_em, now());
  else
    new.concluida_em := null;
  end if;
  return new;
end $$;

create or replace function public.log_task_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_new record;
  v_old_done boolean;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'tarefa_criada', jsonb_build_object('titulo', new.titulo, 'task_id', new.id));
  elsif new.stage_id is distinct from old.stage_id then
    select nome, is_done into v_new from public.project_stages where id = new.stage_id;
    select is_done into v_old_done from public.project_stages where id = old.stage_id;
    perform public.log_activity(
      new.project_id,
      case when v_new.is_done and not coalesce(v_old_done, false) then 'tarefa_concluida' else 'tarefa_movida' end,
      jsonb_build_object('titulo', new.titulo, 'task_id', new.id, 'para', v_new.nome));
  end if;
  return new;
end $$;

create or replace function public.log_project_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.id, 'projeto_criado', jsonb_build_object('nome', new.nome));
    return new;
  end if;
  if new.situacao_atual is distinct from old.situacao_atual then
    perform public.log_activity(new.id, 'situacao_atualizada', jsonb_build_object('texto', new.situacao_atual));
  end if;
  if new.prioridade is distinct from old.prioridade then
    perform public.log_activity(new.id, 'prioridade_alterada', jsonb_build_object('de', old.prioridade, 'para', new.prioridade));
  end if;
  if new.prazo is distinct from old.prazo then
    perform public.log_activity(new.id, 'prazo_alterado', jsonb_build_object('de', old.prazo, 'para', new.prazo));
  end if;
  return new;
end $$;

-- Ao marcar/desmarcar "etapa de conclusão", recalcula concluida_em das tarefas dela
create or replace function public.stages_refresh_tasks()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_done is distinct from old.is_done then
    update public.tasks set stage_id = stage_id where stage_id = new.id;
  end if;
  return new;
end $$;
create trigger project_stages_done after update on public.project_stages
  for each row execute function public.stages_refresh_tasks();

-- Converter ideia em tarefa: vai para a primeira etapa do projeto
create or replace function public.convert_idea_to_task(p_idea_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_idea  public.ideas;
  v_task  uuid;
  v_stage uuid;
begin
  select * into v_idea from public.ideas where id = p_idea_id for update;
  if not found then raise exception 'Ideia não encontrada ou sem permissão'; end if;
  if v_idea.convertida_em_task_id is not null then raise exception 'Ideia já convertida'; end if;

  select id into v_stage from public.project_stages
  where project_id = v_idea.project_id order by posicao limit 1;
  if v_stage is null then raise exception 'O projeto não tem etapas'; end if;

  insert into public.tasks (project_id, stage_id, titulo, descricao, posicao)
  values (
    v_idea.project_id, v_stage, v_idea.titulo, v_idea.descricao,
    coalesce((select max(posicao) from public.tasks where stage_id = v_stage), 0) + 1000
  ) returning id into v_task;

  update public.ideas set convertida_em_task_id = v_task where id = p_idea_id;
  return v_task;
end $$;

-- 5) Remove o status antigo (a view depende dele, então é recriada)
drop view public.projects_with_progress;
alter table public.tasks    drop column status;
alter table public.projects drop column status;
alter table public.projects drop column posicao;
drop type public.task_status;
drop type public.project_status;

create view public.projects_with_progress
with (security_invoker = true) as
select
  p.*,
  coalesce(t.total, 0)::int  as tasks_total,
  coalesce(t.feitas, 0)::int as tasks_feitas,
  case when coalesce(t.total, 0) = 0 then 0
       else round(100.0 * t.feitas / t.total)::int end as progresso,
  coalesce(
    (select array_agg(m.user_id) from public.project_members m where m.project_id = p.id),
    '{}'::uuid[]
  ) as responsaveis_ids
from public.projects p
left join lateral (
  select count(*) as total, count(*) filter (where s.is_done) as feitas
  from public.tasks tk
  join public.project_stages s on s.id = tk.stage_id
  where tk.project_id = p.id
) t on true;

-- 6) Realtime
alter publication supabase_realtime add table public.project_stages;
-- 0012: planejamento detalhado (horas, descrição e datas por etapa; horas por tarefa; imagens)

-- Previsão de horas do projeto todo
alter table public.projects
  add column horas_previstas numeric(8,1) check (horas_previstas is null or horas_previstas >= 0);

-- Cada etapa: explicação detalhada, previsão de horas e datas
alter table public.project_stages
  add column descricao text,
  add column horas_previstas numeric(8,1) check (horas_previstas is null or horas_previstas >= 0),
  add column data_inicio date,
  add column prazo date;

-- Cada tarefa: horas previstas e realizadas
alter table public.tasks
  add column horas_previstas  numeric(8,1) check (horas_previstas  is null or horas_previstas  >= 0),
  add column horas_realizadas numeric(8,1) check (horas_realizadas is null or horas_realizadas >= 0);

-- Imagens/arquivos podem ser do projeto (os dois nulos), de uma etapa ou de uma tarefa
alter table public.attachments
  add column stage_id uuid references public.project_stages(id) on delete cascade,
  add column task_id  uuid references public.tasks(id) on delete cascade;
create index attachments_stage_idx on public.attachments (stage_id);
create index attachments_task_idx  on public.attachments (task_id);

-- A view lista as colunas do projeto no momento em que é criada: precisa ser recriada
drop view public.projects_with_progress;
create view public.projects_with_progress
with (security_invoker = true) as
select
  p.*,
  coalesce(t.total, 0)::int  as tasks_total,
  coalesce(t.feitas, 0)::int as tasks_feitas,
  case when coalesce(t.total, 0) = 0 then 0
       else round(100.0 * t.feitas / t.total)::int end as progresso,
  coalesce(
    (select array_agg(m.user_id) from public.project_members m where m.project_id = p.id),
    '{}'::uuid[]
  ) as responsaveis_ids,
  coalesce((select sum(s.horas_previstas)  from public.project_stages s where s.project_id = p.id), 0)::float8 as horas_etapas,
  coalesce((select sum(k.horas_previstas)  from public.tasks k          where k.project_id = p.id), 0)::float8 as horas_tarefas,
  coalesce((select sum(k.horas_realizadas) from public.tasks k          where k.project_id = p.id), 0)::float8 as horas_realizadas
from public.projects p
left join lateral (
  select count(*) as total, count(*) filter (where s.is_done) as feitas
  from public.tasks tk
  join public.project_stages s on s.id = tk.stage_id
  where tk.project_id = p.id
) t on true;
-- 0013: a ETAPA é o card (a "tarefa"): nome livre + tag de status. Não há mais tarefas dentro da etapa.

create type public.etapa_status as enum ('ideia', 'planejamento', 'em_andamento', 'em_pausa', 'concluido');

-- A view depende de tasks e de is_done: sai agora e volta no fim
drop view if exists public.projects_with_progress;

alter table public.project_stages
  add column status public.etapa_status not null default 'planejamento',
  add column horas_realizadas numeric(8,1) check (horas_realizadas is null or horas_realizadas >= 0),
  add column responsavel_id uuid references public.profiles(id) on delete set null,
  add column concluida_em timestamptz;

-- As etapas padrão antigas (que eram colunas de status) e estão vazias saem
delete from public.project_stages s
where s.nome in ('Ideia', 'Planejamento', 'Em andamento', 'Em pausa', 'Concluído')
  and not exists (select 1 from public.tasks t where t.stage_id = s.id);

-- As que sobraram ganham o status que o nome/flag indicava
update public.project_stages set
  status = (case when is_done then 'concluido'
                 when nome = 'Ideia' then 'ideia'
                 when nome = 'Em andamento' then 'em_andamento'
                 when nome = 'Em pausa' then 'em_pausa'
                 else 'planejamento' end)::public.etapa_status,
  concluida_em = case when is_done then now() end;

-- Limpeza do modelo antigo
drop trigger if exists projects_seed on public.projects;
drop function if exists public.projects_seed_stages();
drop function if exists public.seed_project_stages(uuid);
drop trigger if exists project_stages_done on public.project_stages;
drop function if exists public.stages_refresh_tasks();
drop function if exists public.convert_idea_to_task(uuid);

-- Ideias passam a virar etapas
alter table public.ideas drop column convertida_em_task_id;
alter table public.ideas add column convertida_em_stage_id uuid references public.project_stages(id) on delete set null;
alter table public.attachments drop column task_id;

drop table public.tasks cascade;
drop function if exists public.tasks_set_concluida();
drop function if exists public.log_task_changes();
drop type if exists public.task_status;

alter table public.project_stages drop column is_done;

-- Datas de conclusão e histórico das etapas
create or replace function public.stages_set_concluida()
returns trigger language plpgsql as $$
begin
  if new.status = 'concluido' then
    new.concluida_em := coalesce(new.concluida_em, now());
  else
    new.concluida_em := null;
  end if;
  return new;
end $$;
create trigger stages_concluida before insert or update on public.project_stages
  for each row execute function public.stages_set_concluida();

create or replace function public.log_stage_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'etapa_criada', jsonb_build_object('nome', new.nome));
  elsif new.status is distinct from old.status then
    perform public.log_activity(
      new.project_id,
      case when new.status = 'concluido' then 'etapa_concluida' else 'etapa_status' end,
      jsonb_build_object('nome', new.nome, 'para', new.status));
  end if;
  return new;
end $$;
create trigger stages_log after insert or update on public.project_stages
  for each row execute function public.log_stage_changes();

create or replace function public.log_idea_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'ideia_criada', jsonb_build_object('titulo', new.titulo));
  elsif old.convertida_em_stage_id is null and new.convertida_em_stage_id is not null then
    perform public.log_activity(new.project_id, 'ideia_convertida', jsonb_build_object('titulo', new.titulo));
  end if;
  return new;
end $$;

-- Converter ideia em etapa (nasce com a tag "Ideia", no fim da lista)
create or replace function public.convert_idea_to_stage(p_idea_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_idea  public.ideas;
  v_stage uuid;
begin
  select * into v_idea from public.ideas where id = p_idea_id for update;
  if not found then raise exception 'Ideia não encontrada ou sem permissão'; end if;
  if v_idea.convertida_em_stage_id is not null then raise exception 'Ideia já convertida'; end if;

  insert into public.project_stages (project_id, nome, descricao, status, posicao)
  values (
    v_idea.project_id, v_idea.titulo, v_idea.descricao, 'ideia',
    coalesce((select max(posicao) from public.project_stages where project_id = v_idea.project_id), 0) + 1000
  ) returning id into v_stage;

  update public.ideas set convertida_em_stage_id = v_stage where id = p_idea_id;
  return v_stage;
end $$;
grant execute on function public.convert_idea_to_stage(uuid) to authenticated;

-- Progresso do projeto = etapas concluídas / etapas
create view public.projects_with_progress
with (security_invoker = true) as
select
  p.*,
  coalesce(t.total, 0)::int  as etapas_total,
  coalesce(t.feitas, 0)::int as etapas_feitas,
  case when coalesce(t.total, 0) = 0 then 0
       else round(100.0 * t.feitas / t.total)::int end as progresso,
  coalesce(
    (select array_agg(m.user_id) from public.project_members m where m.project_id = p.id),
    '{}'::uuid[]
  ) as responsaveis_ids,
  coalesce(t.horas_prev, 0)::float8 as horas_etapas,
  coalesce(t.horas_real, 0)::float8 as horas_realizadas
from public.projects p
left join lateral (
  select count(*) as total,
         count(*) filter (where status = 'concluido') as feitas,
         sum(horas_previstas)  as horas_prev,
         sum(horas_realizadas) as horas_real
  from public.project_stages where project_id = p.id
) t on true;
-- 0014: bloqueios e riscos nas etapas

-- PARTE 1: as colunas novas
create type public.risco_nivel as enum ('baixo', 'medio', 'alto');

alter table public.project_stages
  add column bloqueada boolean not null default false,
  add column bloqueio_motivo text,
  add column risco public.risco_nivel;

-- PARTE 2: o histórico passa a registrar quando uma etapa é bloqueada ou liberada
create or replace function public.log_stage_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_acao text;
  v_det  jsonb;
begin
  if tg_op = 'INSERT' then
    v_det := jsonb_build_object('nome', new.nome);
    perform public.log_activity(new.project_id, 'etapa_criada', v_det);
    return new;
  end if;

  if new.status is distinct from old.status then
    v_acao := 'etapa_status';
    if new.status = 'concluido' then
      v_acao := 'etapa_concluida';
    end if;
    v_det := jsonb_build_object('nome', new.nome, 'para', new.status);
    perform public.log_activity(new.project_id, v_acao, v_det);
  end if;

  if new.bloqueada is distinct from old.bloqueada then
    v_acao := 'etapa_desbloqueada';
    if new.bloqueada then
      v_acao := 'etapa_bloqueada';
    end if;
    v_det := jsonb_build_object('nome', new.nome, 'motivo', new.bloqueio_motivo);
    perform public.log_activity(new.project_id, v_acao, v_det);
  end if;

  return new;
end $$;
create table public.stage_members (
  stage_id uuid not null references public.project_stages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stage_id, user_id)
);
create index stage_members_user_idx on public.stage_members (user_id);

alter table public.stage_members enable row level security;
create policy read_all on public.stage_members for select to authenticated using (true);
create policy ti_insert on public.stage_members for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.stage_members for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

insert into public.stage_members (stage_id, user_id)
select id, responsavel_id from public.project_stages where responsavel_id is not null
on conflict do nothing;

alter table public.project_stages drop column responsavel_id;

alter publication supabase_realtime add table public.stage_members;
alter table public.projects add column notas text;
alter table public.project_stages add column notas text;

create type public.pedido_status as enum ('novo', 'em_analise', 'aprovado', 'recusado', 'convertido');
create type public.pedido_urgencia as enum ('baixa', 'media', 'alta', 'urgente');

create table public.requests (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(trim(titulo)) > 0),
  descricao      text,
  setor          text,
  urgencia       public.pedido_urgencia not null default 'media',
  status         public.pedido_status not null default 'novo',
  solicitante_id uuid references public.profiles(id) on delete set null default auth.uid(),
  resposta       text,
  decidido_por   uuid references public.profiles(id) on delete set null,
  decidido_em    timestamptz,
  project_id     uuid references public.projects(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index requests_status_idx on public.requests (status, created_at desc);

alter table public.requests enable row level security;
create policy req_read on public.requests for select to authenticated using (true);
create policy req_insert on public.requests for insert to authenticated
  with check (solicitante_id = auth.uid() and status = 'novo');
create policy req_update_ti on public.requests for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy req_update_own on public.requests for update to authenticated
  using (solicitante_id = auth.uid() and status = 'novo')
  with check (solicitante_id = auth.uid() and status = 'novo');
create policy req_delete on public.requests for delete to authenticated
  using (public.app_role() in ('ti', 'admin') or (solicitante_id = auth.uid() and status = 'novo'));

create or replace function public.requests_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.decidido_por := auth.uid();
    new.decidido_em := now();
  end if;
  return new;
end $$;
create trigger requests_decision_trg before update on public.requests
  for each row execute function public.requests_decision();

create or replace function public.convert_request_to_project(p_request_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_req     public.requests;
  v_project uuid;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if not found then raise exception 'Pedido não encontrado ou sem permissão'; end if;
  if v_req.status = 'convertido' then raise exception 'Este pedido já virou projeto'; end if;
  if v_req.status = 'recusado' then raise exception 'Um pedido recusado não pode virar projeto'; end if;

  insert into public.projects (nome, descricao, prioridade)
  values (v_req.titulo, v_req.descricao, v_req.urgencia::text::public.priority)
  returning id into v_project;

  update public.requests set status = 'convertido', project_id = v_project where id = p_request_id;
  return v_project;
end $$;
grant execute on function public.convert_request_to_project(uuid) to authenticated;

alter publication supabase_realtime add table public.requests;
create type public.projeto_modo as enum ('desenvolvimento', 'manutencao');

alter table public.projects add column modo public.projeto_modo not null default 'desenvolvimento';

drop view public.projects_with_progress;

create view public.projects_with_progress
with (security_invoker = true) as
select
  p.id, p.nome, p.descricao, p.prioridade, p.situacao_atual, p.data_inicio, p.prazo, p.tags,
  p.horas_previstas, p.created_at, p.updated_at, p.modo,
  coalesce(t.total, 0)::int  as etapas_total,
  coalesce(t.feitas, 0)::int as etapas_feitas,
  case when coalesce(t.total, 0) = 0 then 0
       else round(100.0 * t.feitas / t.total)::int end as progresso,
  coalesce(
    (select array_agg(m.user_id) from public.project_members m where m.project_id = p.id),
    '{}'::uuid[]
  ) as responsaveis_ids,
  coalesce(t.horas_prev, 0)::float8 as horas_etapas,
  coalesce(t.horas_real, 0)::float8 as horas_realizadas
from public.projects p
left join lateral (
  select count(*) as total,
         count(*) filter (where status = 'concluido') as feitas,
         sum(horas_previstas)  as horas_prev,
         sum(horas_realizadas) as horas_real
  from public.project_stages where project_id = p.id
) t on true;
create table public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(trim(nome)) > 0),
  prefixo      text not null,
  token_hash   text not null unique,
  criado_por   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

alter table public.api_tokens enable row level security;
create policy tok_read on public.api_tokens for select to authenticated using (public.app_role() = 'admin');
create policy tok_insert on public.api_tokens for insert to authenticated with check (public.app_role() = 'admin');
create policy tok_update on public.api_tokens for update to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy tok_delete on public.api_tokens for delete to authenticated using (public.app_role() = 'admin');

-- 0019: novo fluxo de pedidos
--
-- Admin abre escolhendo a urgência -> novo
-- TI analisa                       -> em_analise
-- TI aprova definindo o prazo      -> aprovado -> convertido (o prazo vai para o projeto)
-- TI recusa com justificativa      -> recusado
--
-- A API de integração usa a service role e continua podendo criar pedidos.

alter table public.requests add column prazo date;

-- Sem default: a urgência é sempre uma escolha de quem abre.
alter table public.requests alter column urgencia drop default;

-- not valid: pedidos antigos continuam legíveis; a regra vale para o que for gravado daqui em diante.
alter table public.requests
  add constraint requests_aprovado_com_prazo check (status <> 'aprovado' or prazo is not null) not valid,
  add constraint requests_recusa_justificada check (status <> 'recusado' or btrim(coalesce(resposta, '')) <> '') not valid;

-- Abrir: somente admin, sempre em nome próprio.
drop policy req_insert on public.requests;
create policy req_insert on public.requests for insert to authenticated
  with check (public.app_role() = 'admin' and solicitante_id = auth.uid() and status = 'novo');

-- O pedido só muda pela mão de quem abriu, enquanto está "novo". O prazo é da TI.
-- Sem auth.uid(): SQL Editor, service role ou o on delete set null ao excluir um usuário.
create or replace function public.requests_guard()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.titulo, new.descricao, new.setor, new.urgencia, new.solicitante_id)
     is distinct from (old.titulo, old.descricao, old.setor, old.urgencia, old.solicitante_id)
     and not (old.status = 'novo' and old.solicitante_id = auth.uid()) then
    raise exception 'O pedido e a urgência só podem ser alterados por quem abriu, enquanto ele estiver como Novo';
  end if;
  if new.prazo is distinct from old.prazo and public.app_role() not in ('ti', 'admin') then
    raise exception 'Somente a TI define o prazo do pedido';
  end if;
  return new;
end $$;

create trigger requests_guard_trg before update on public.requests
  for each row execute function public.requests_guard();

-- Só pedido aprovado (portanto com prazo) vira projeto, e o prazo acompanha.
create or replace function public.convert_request_to_project(p_request_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_req     public.requests;
  v_project uuid;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if not found then raise exception 'Pedido não encontrado ou sem permissão'; end if;
  if v_req.status = 'convertido' then raise exception 'Este pedido já virou projeto'; end if;
  if v_req.status <> 'aprovado' or v_req.prazo is null then
    raise exception 'Aprove o pedido com um prazo antes de transformá-lo em projeto';
  end if;

  insert into public.projects (nome, descricao, prioridade, prazo)
  values (v_req.titulo, v_req.descricao, v_req.urgencia::text::public.priority, v_req.prazo)
  returning id into v_project;

  update public.requests set status = 'convertido', project_id = v_project where id = p_request_id;
  return v_project;
end $$;

-- 0020: horário opcional no prazo do pedido (para o que é resolvido no mesmo dia)

alter table public.requests add column prazo_hora time;

alter table public.requests
  add constraint requests_hora_com_prazo check (prazo_hora is null or prazo is not null);

-- Mesma regra da 0019, agora cobrindo também o horário.
create or replace function public.requests_guard()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.titulo, new.descricao, new.setor, new.urgencia, new.solicitante_id)
     is distinct from (old.titulo, old.descricao, old.setor, old.urgencia, old.solicitante_id)
     and not (old.status = 'novo' and old.solicitante_id = auth.uid()) then
    raise exception 'O pedido e a urgência só podem ser alterados por quem abriu, enquanto ele estiver como Novo';
  end if;
  if (new.prazo, new.prazo_hora) is distinct from (old.prazo, old.prazo_hora)
     and public.app_role() not in ('ti', 'admin') then
    raise exception 'Somente a TI define o prazo do pedido';
  end if;
  return new;
end $$;
