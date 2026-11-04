-- 0003: Row Level Security em todas as tabelas

alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.tasks        enable row level security;
alter table public.ideas        enable row level security;
alter table public.comments     enable row level security;
alter table public.attachments  enable row level security;
alter table public.activity_log enable row level security;

-- Leitura: todo usuário autenticado lê tudo
create policy read_all on public.profiles     for select to authenticated using (true);
create policy read_all on public.projects     for select to authenticated using (true);
create policy read_all on public.tasks        for select to authenticated using (true);
create policy read_all on public.ideas        for select to authenticated using (true);
create policy read_all on public.comments     for select to authenticated using (true);
create policy read_all on public.attachments  for select to authenticated using (true);
create policy read_all on public.activity_log for select to authenticated using (true);

-- Escrita: somente ti e admin (projects, tasks, ideas, attachments)
create policy ti_insert on public.projects for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.projects for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.projects for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

create policy ti_insert on public.tasks for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.tasks for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.tasks for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

create policy ti_insert on public.ideas for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.ideas for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.ideas for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

create policy ti_insert on public.attachments for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_update on public.attachments for update to authenticated
  using (public.app_role() in ('ti', 'admin'))
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.attachments for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

-- Comentários: qualquer autenticado comenta como si mesmo;
-- só o autor ou admin edita/exclui.
create policy c_insert on public.comments for insert to authenticated
  with check (autor_id = auth.uid());
create policy c_update on public.comments for update to authenticated
  using (autor_id = auth.uid() or public.app_role() = 'admin')
  with check (autor_id = auth.uid() or public.app_role() = 'admin');
create policy c_delete on public.comments for delete to authenticated
  using (autor_id = auth.uid() or public.app_role() = 'admin');

-- activity_log: nenhuma policy de escrita. Só triggers SECURITY DEFINER (0004).

-- Profiles: cada um edita o próprio registro; admin edita qualquer um.
-- Não há INSERT/DELETE pelo cliente (insert vem do trigger de signup).
create policy p_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.app_role() = 'admin')
  with check (id = auth.uid() or public.app_role() = 'admin');

-- Trava de escalonamento: só admin altera role.
-- auth.uid() nulo = SQL Editor / service role (permite promover o 1º admin).
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and public.app_role() <> 'admin' then
    raise exception 'Apenas administradores podem alterar o perfil de acesso';
  end if;
  return new;
end $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();
