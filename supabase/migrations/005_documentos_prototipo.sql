-- gabi · Ficha técnica ligada a prototipo (producto)
-- Ejecutar DESPUÉS de 004_documentos_ficha_tecnica.sql

alter table public.documentos
  add column if not exists prototipo_id text;

create index if not exists documentos_prototipo_idx on public.documentos (prototipo_id);
