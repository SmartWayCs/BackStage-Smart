-- 0005: bucket privado de anexos (limite 10 MB). Path: {project_id}/{uuid}-{nome}

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.app_role() in ('ti', 'admin'));
create policy attachments_update on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and public.app_role() in ('ti', 'admin'));
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.app_role() in ('ti', 'admin'));
