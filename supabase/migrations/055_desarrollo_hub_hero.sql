-- gabi · Portada editable del hub de desarrollos
-- Ejecutar DESPUÉS de 054_gabi_assets_storage.sql

alter table public.desarrollos_catalog
  add column if not exists hub_hero_image text;

comment on column public.desarrollos_catalog.hub_hero_image is
  'Imagen wide de portada en admin/desarrollos y tarjetas del hub. Sobreescribe defaults en código.';
