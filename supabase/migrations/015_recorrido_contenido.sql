-- gabi · Contenido del recorrido por desarrollo (zona, desarrollador, guiones)
-- Ejecutar DESPUÉS de 014_visitas_comerciales.sql

alter table public.desarrollos_catalog
  add column if not exists recorrido_contenido jsonb;

comment on column public.desarrollos_catalog.recorrido_contenido is
  'Guion comercial del recorrido: zona, desarrollador, overview, bondades, técnicas de cierre.';
