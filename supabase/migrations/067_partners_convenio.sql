-- gabi · Convenio digitalizado por aliado (inmobiliaria / asesor externo)

alter table public.partners
  add column if not exists convenio_storage_path text,
  add column if not exists convenio_public_url text,
  add column if not exists convenio_nombre_archivo text,
  add column if not exists convenio_subido_at timestamptz,
  add column if not exists convenio_subido_por uuid;

comment on column public.partners.convenio_public_url is
  'URL pública del PDF del convenio con casa alianza.';

comment on column public.partners.convenio_storage_path is
  'Ruta en bucket gabi-documentos: partners/{comercializadora}/{partnerId}/…';
