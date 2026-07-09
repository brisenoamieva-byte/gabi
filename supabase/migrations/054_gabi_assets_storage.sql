-- gabi · Storage imágenes de catálogo, guión y branding de desarrollos
-- Ejecutar DESPUÉS de 053_la_vista_pausado.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gabi-assets',
  'gabi-assets',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "gabi_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'gabi-assets');

create policy "gabi_assets_service_all"
  on storage.objects for all
  to service_role
  using (bucket_id = 'gabi-assets')
  with check (bucket_id = 'gabi-assets');
