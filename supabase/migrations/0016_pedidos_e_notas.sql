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
