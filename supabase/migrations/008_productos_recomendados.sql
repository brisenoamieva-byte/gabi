-- gabi · Productos recomendados para mostrar (Paso 3)
-- Ejecutar DESPUÉS de 007_fix_admin_profiles_rls.sql

alter table public.disponibilidad_unidades
  add column if not exists orden int not null default 0,
  add column if not exists visitable boolean not null default true,
  add column if not exists prioridad_comercial text not null default 'media'
    check (prioridad_comercial in ('alta', 'media', 'baja')),
  add column if not exists razones_venta text[] not null default '{}',
  add column if not exists ubicacion_comercial text,
  add column if not exists instruccion_recorrido text,
  add column if not exists nota_acceso text;

create index if not exists disponibilidad_activo_cluster_idx
  on public.disponibilidad_unidades (cluster_id, activo, orden);

comment on table public.disponibilidad_unidades is
  'Productos curados por gerente para mostrar en recorrido. No es inventario completo (eso vive en PDF).';
