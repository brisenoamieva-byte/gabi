-- gabi · Documentos — alcance por etapa
-- Ejecutar DESPUÉS de 001 y 002

alter table public.documentos
  add column if not exists etapa text;

create index if not exists documentos_etapa_idx on public.documentos (cluster_id, etapa);
