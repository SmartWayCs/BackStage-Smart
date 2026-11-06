create table public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(trim(nome)) > 0),
  prefixo      text not null,
  token_hash   text not null unique,
  criado_por   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

alter table public.api_tokens enable row level security;
create policy tok_read on public.api_tokens for select to authenticated using (public.app_role() = 'admin');
create policy tok_insert on public.api_tokens for insert to authenticated with check (public.app_role() = 'admin');
create policy tok_update on public.api_tokens for update to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy tok_delete on public.api_tokens for delete to authenticated using (public.app_role() = 'admin');
