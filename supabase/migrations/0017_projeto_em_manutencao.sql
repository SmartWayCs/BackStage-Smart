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
