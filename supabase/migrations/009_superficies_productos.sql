-- gabi · Superficies terreno / construcción en productos recomendados
-- Ejecutar DESPUÉS de 008_productos_recomendados.sql

alter table public.disponibilidad_unidades
  add column if not exists superficie_terreno_m2 numeric,
  add column if not exists superficie_construccion_m2 numeric;

-- Migrar dato legacy (superficie_m2) según tipo
update public.disponibilidad_unidades
set superficie_terreno_m2 = superficie_m2
where superficie_m2 is not null
  and tipo = 'terreno'
  and superficie_terreno_m2 is null;

update public.disponibilidad_unidades
set superficie_construccion_m2 = superficie_m2
where superficie_m2 is not null
  and tipo = 'departamento'
  and superficie_construccion_m2 is null;

update public.disponibilidad_unidades
set
  superficie_construccion_m2 = coalesce(superficie_construccion_m2, superficie_m2),
  superficie_terreno_m2 = coalesce(superficie_terreno_m2, superficie_m2)
where superficie_m2 is not null
  and tipo = 'casa'
  and superficie_terreno_m2 is null
  and superficie_construccion_m2 is null;
