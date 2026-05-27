-- Permitir inventario de oficinas (Pasaje Álamos)
alter table public.disponibilidad_unidades
  drop constraint if exists disponibilidad_unidades_tipo_check;

alter table public.disponibilidad_unidades
  add constraint disponibilidad_unidades_tipo_check
  check (tipo in ('casa', 'departamento', 'terreno', 'oficina'));
