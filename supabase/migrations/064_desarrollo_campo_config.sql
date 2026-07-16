-- gabi · Config comercial editable por desarrollo (sin tocar código)
-- Cotizador genérico, datos bancarios y carpeta Drive — desde admin.

alter table public.desarrollos_catalog
  add column if not exists campo_config jsonb not null default '{}'::jsonb;

comment on column public.desarrollos_catalog.campo_config is
  'Pack de campo: cotizadorRules, datosBancarios, driveFolderId. Editable en /admin/desarrollos.';

-- Semilla opcional: desarrollo nuevos quedan en {}. Los existentes siguen con fallbacks en código
-- hasta que se editen en admin.
