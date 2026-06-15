-- gabi · Storage imágenes de estudios de mercado
-- Ejecutar DESPUÉS de 030_nubo_estudio_contenido.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gabi-estudios',
  'gabi-estudios',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "gabi_estudios_public_read"
  on storage.objects for select
  using (bucket_id = 'gabi-estudios');

create policy "gabi_estudios_service_all"
  on storage.objects for all
  to service_role
  using (bucket_id = 'gabi-estudios')
  with check (bucket_id = 'gabi-estudios');
