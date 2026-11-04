-- 0001: enums, profiles, helpers

create type user_role      as enum ('ti', 'supervisao', 'admin');
create type project_status as enum ('ideia', 'planejamento', 'em_andamento', 'em_pausa', 'concluido');
create type priority       as enum ('baixa', 'media', 'alta', 'urgente');
create type task_status    as enum ('a_fazer', 'fazendo', 'feito');

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  nome        text not null,
  email       text not null,
  role        user_role not null default 'supervisao',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Papel do usuário logado. Usado em todas as policies.
-- SECURITY DEFINER evita recursão de RLS ao consultar profiles.
-- (Nome app_role porque current_role é palavra reservada do Postgres.)
create or replace function public.app_role()
returns user_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

-- Cria o profile automaticamente quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
