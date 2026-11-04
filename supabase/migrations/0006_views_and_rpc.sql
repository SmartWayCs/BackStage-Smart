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
