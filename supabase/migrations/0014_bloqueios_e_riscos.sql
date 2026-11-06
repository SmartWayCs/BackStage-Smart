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
