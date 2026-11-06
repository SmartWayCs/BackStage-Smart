-- 0009: login por e-mail OU nome de usuário

-- 1) Coluna username (preenchida para quem já existe a partir do e-mail)
alter table public.profiles add column username text;

with base as (
  select id,
         case when length(u) < 3 then u || 'user' else u end as u
  from (
    select id, left(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g'), 26) as u
    from public.profiles
  ) s
), ranked as (
  select id, u, row_number() over (partition by u order by id) as rn from base
)
update public.profiles p
set username = case when r.rn = 1 then r.u else r.u || r.rn end
from ranked r where p.id = r.id;

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9._-]{3,30}$');
create unique index profiles_username_key on public.profiles (username);

-- 2) Novo usuário no Auth: gera o username (do metadata ou do e-mail), sem repetir
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_user text;
  v_n    int := 1;
begin
  v_base := left(regexp_replace(
    lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))),
    '[^a-z0-9._-]', '', 'g'), 26);
  if length(v_base) < 3 then v_base := v_base || 'user'; end if;
  v_user := v_base;
  while exists (select 1 from public.profiles where username = v_user) loop
    v_n := v_n + 1;
    v_user := v_base || v_n;
  end loop;

  insert into public.profiles (id, nome, email, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    v_user
  );
  return new;
end $$;

-- 3) Descobre o e-mail para o login. Se já veio um e-mail, devolve ele mesmo.
--    Pode ser chamada antes do login (anon), por isso só devolve o e-mail do username informado.
create or replace function public.login_email(p_identifier text)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when position('@' in p_identifier) > 0 then lower(trim(p_identifier))
    else (select email from public.profiles where username = lower(trim(p_identifier)))
  end
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;
