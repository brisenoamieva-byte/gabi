-- gabi · Storage para documentos PDF
-- Ejecutar DESPUÉS de 001_admin_foundation.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gabi-documentos',
  'gabi-documentos',
  true,
  52428800,
  array['application/pdf']
)
on conflict (id) do nothing;

-- Lectura pública (asesores descargan PDFs)
create policy "gabi_documentos_public_read"
  on storage.objects for select
  using (bucket_id = 'gabi-documentos');

-- Admins autenticados suben y gestionan
create policy "gabi_documentos_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'gabi-documentos'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

create policy "gabi_documentos_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'gabi-documentos'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

create policy "gabi_documentos_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'gabi-documentos'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );
