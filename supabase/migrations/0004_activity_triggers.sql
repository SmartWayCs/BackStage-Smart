-- 0004: triggers que preenchem activity_log (única forma de escrita nessa tabela)

create or replace function public.log_activity(p_project uuid, p_acao text, p_detalhes jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log (project_id, usuario_id, acao, detalhes)
  values (p_project, auth.uid(), p_acao, p_detalhes);
$$;
-- Não pode ser chamada pelo cliente via RPC
revoke all on function public.log_activity(uuid, text, jsonb) from public, anon, authenticated;

-- tasks.concluida_em automático
create or replace function public.tasks_set_concluida()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'feito' then new.concluida_em := coalesce(new.concluida_em, now());
    else new.concluida_em := null; end if;
  elsif new.status = 'feito' and old.status <> 'feito' then
    new.concluida_em := now();
  elsif new.status <> 'feito' then
    new.concluida_em := null;
  end if;
  return new;
end $$;
create trigger tasks_concluida before insert or update on public.tasks
  for each row execute function public.tasks_set_concluida();

-- projects
create or replace function public.log_project_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.id, 'projeto_criado', jsonb_build_object('nome', new.nome));
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.log_activity(new.id, 'status_alterado', jsonb_build_object('de', old.status, 'para', new.status));
  end if;
  if new.situacao_atual is distinct from old.situacao_atual then
    perform public.log_activity(new.id, 'situacao_atualizada', jsonb_build_object('texto', new.situacao_atual));
  end if;
  if new.responsavel_id is distinct from old.responsavel_id then
    perform public.log_activity(new.id, 'responsavel_alterado', jsonb_build_object('de', old.responsavel_id, 'para', new.responsavel_id));
  end if;
  if new.prioridade is distinct from old.prioridade then
    perform public.log_activity(new.id, 'prioridade_alterada', jsonb_build_object('de', old.prioridade, 'para', new.prioridade));
  end if;
  if new.prazo is distinct from old.prazo then
    perform public.log_activity(new.id, 'prazo_alterado', jsonb_build_object('de', old.prazo, 'para', new.prazo));
  end if;
  return new;
end $$;
create trigger projects_log after insert or update on public.projects
  for each row execute function public.log_project_changes();

-- tasks
create or replace function public.log_task_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'tarefa_criada', jsonb_build_object('titulo', new.titulo, 'task_id', new.id));
  elsif new.status is distinct from old.status then
    perform public.log_activity(
      new.project_id,
      case when new.status = 'feito' then 'tarefa_concluida' else 'tarefa_movida' end,
      jsonb_build_object('titulo', new.titulo, 'task_id', new.id, 'para', new.status));
  end if;
  return new;
end $$;
create trigger tasks_log after insert or update on public.tasks
  for each row execute function public.log_task_changes();

-- comments
create or replace function public.log_comment_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.project_id, 'comentario_adicionado',
    jsonb_build_object('trecho', left(new.conteudo, 140), 'comment_id', new.id));
  return new;
end $$;
create trigger comments_log after insert on public.comments
  for each row execute function public.log_comment_added();

-- ideas
create or replace function public.log_idea_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, 'ideia_criada', jsonb_build_object('titulo', new.titulo));
  elsif old.convertida_em_task_id is null and new.convertida_em_task_id is not null then
    perform public.log_activity(new.project_id, 'ideia_convertida',
      jsonb_build_object('titulo', new.titulo, 'task_id', new.convertida_em_task_id));
  end if;
  return new;
end $$;
create trigger ideas_log after insert or update on public.ideas
  for each row execute function public.log_idea_changes();

-- attachments
create or replace function public.log_attachment_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.project_id, 'anexo_adicionado', jsonb_build_object('nome', new.nome));
  return new;
end $$;
create trigger attachments_log after insert on public.attachments
  for each row execute function public.log_attachment_added();
