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
