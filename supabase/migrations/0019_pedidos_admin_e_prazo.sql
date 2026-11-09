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
