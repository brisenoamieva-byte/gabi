-- Detalles adicionales por unidad (superficies separadas y cajones).
-- Útil para Pasaje Álamos (departamentos y oficinas).
alter table public.disponibilidad_unidades
  add column if not exists superficie_interna_m2 numeric,
  add column if not exists superficie_externa_m2 numeric,
  add column if not exists superficie_bodega_m2 numeric,
  add column if not exists cajones smallint;
