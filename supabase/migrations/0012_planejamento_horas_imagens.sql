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
