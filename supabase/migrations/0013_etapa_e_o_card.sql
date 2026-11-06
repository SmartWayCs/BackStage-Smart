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
