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
