-- 0007: habilita Supabase Realtime nas tabelas usadas pelo app
alter publication supabase_realtime add table
  public.profiles, public.projects, public.tasks, public.ideas,
  public.comments, public.attachments, public.activity_log;
