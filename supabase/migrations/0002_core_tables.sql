-- 0002: tabelas principais

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  descricao       text,
  status          project_status not null default 'ideia',
  prioridade      priority not null default 'media',
  responsavel_id  uuid references public.profiles(id) on delete set null,
  situacao_atual  text,
  data_inicio     date,
  prazo           date,
  tags            text[] not null default '{}',
  posicao         double precision not null default 0, -- ordem dentro da coluna
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  status          task_status not null default 'a_fazer',
  responsavel_id  uuid references public.profiles(id) on delete set null,
  prazo           date,
  posicao         double precision not null default 0,
  concluida_em    timestamptz
);

create table public.ideas (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references public.projects(id) on delete cascade,
  titulo                 text not null,
  descricao              text,
  autor_id               uuid references public.profiles(id) on delete set null,
  convertida_em_task_id  uuid references public.tasks(id) on delete set null,
  created_at             timestamptz not null default now()
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  autor_id    uuid not null references public.profiles(id),
  conteudo    text not null,
  mencoes     uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  arquivo_url  text not null,  -- caminho no bucket 'attachments'
  nome         text not null,
  enviado_por  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  usuario_id  uuid references public.profiles(id) on delete set null,
  acao        text not null,
  detalhes    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index tasks_project_status_idx on public.tasks (project_id, status, posicao);
create index projects_status_idx      on public.projects (status, posicao);
create index ideas_project_idx        on public.ideas (project_id);
create index comments_project_idx     on public.comments (project_id, created_at);
create index attachments_project_idx  on public.attachments (project_id);
create index activity_project_idx     on public.activity_log (project_id, created_at desc);
