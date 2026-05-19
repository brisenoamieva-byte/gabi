-- gabi · Tipo de documento: ficha técnica
-- Ejecutar DESPUÉS de 003_documentos_etapa.sql

alter table public.documentos drop constraint if exists documentos_tipo_check;

alter table public.documentos add constraint documentos_tipo_check
  check (tipo in (
    'brochure_desarrollo',
    'brochure_cluster',
    'disponibilidad',
    'ficha_tecnica',
    'otro'
  ));
