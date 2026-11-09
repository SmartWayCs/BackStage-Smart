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
