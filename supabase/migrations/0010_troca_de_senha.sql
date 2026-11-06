-- 0010: troca de senha obrigatória no primeiro acesso

alter table public.profiles add column must_change_password boolean not null default false;

-- Trava ampliada: só admin altera perfil de acesso e e-mail;
-- a flag de troca de senha só muda via admin ou via complete_password_change().
-- auth.uid() nulo = SQL Editor / service role (Edge Function), sempre permitido.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.app_role() <> 'admin' then
    if new.role is distinct from old.role then
      raise exception 'Apenas administradores podem alterar o perfil de acesso';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Apenas administradores podem alterar o e-mail';
    end if;
    if new.must_change_password is distinct from old.must_change_password
       and coalesce(current_setting('app.allow_pw_flag', true), '') <> '1' then
      raise exception 'Operação não permitida';
    end if;
  end if;
  return new;
end $$;

-- Chamada pelo próprio usuário logo depois de trocar a senha com sucesso.
create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_pw_flag', '1', true);  -- vale só nesta transação
  update public.profiles set must_change_password = false where id = auth.uid();
end $$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;
