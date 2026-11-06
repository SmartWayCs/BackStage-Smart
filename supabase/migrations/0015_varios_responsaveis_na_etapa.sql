create table public.stage_members (
  stage_id uuid not null references public.project_stages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stage_id, user_id)
);
create index stage_members_user_idx on public.stage_members (user_id);

alter table public.stage_members enable row level security;
create policy read_all on public.stage_members for select to authenticated using (true);
create policy ti_insert on public.stage_members for insert to authenticated
  with check (public.app_role() in ('ti', 'admin'));
create policy ti_delete on public.stage_members for delete to authenticated
  using (public.app_role() in ('ti', 'admin'));

insert into public.stage_members (stage_id, user_id)
select id, responsavel_id from public.project_stages where responsavel_id is not null
on conflict do nothing;

alter table public.project_stages drop column responsavel_id;

alter publication supabase_realtime add table public.stage_members;
