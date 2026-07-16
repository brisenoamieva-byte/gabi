-- gabi · Cancelación de operación: registrar si fue en apartado o en venta

alter table public.operaciones_comerciales
  add column if not exists cancelada_en_etapa text;

alter table public.operaciones_comerciales
  drop constraint if exists operaciones_cancelada_en_etapa_check;

alter table public.operaciones_comerciales
  add constraint operaciones_cancelada_en_etapa_check check (
    cancelada_en_etapa is null
    or cancelada_en_etapa in ('apartado', 'venta')
  );

-- Backfill: operaciones ya canceladas
update public.operaciones_comerciales
set cancelada_en_etapa = case
  when coalesce(estatus_sembrado, '') in (
    'Apartado',
    'Apartado pendiente',
    'Cancelado'
  ) then 'apartado'
  when coalesce(estatus_sembrado, '') like 'Vendid%' then 'venta'
  when coalesce(estatus_sembrado, '') like 'Vendido%' then 'venta'
  else 'apartado'
end
where cancelada = true
  and cancelada_en_etapa is null;

comment on column public.operaciones_comerciales.cancelada_en_etapa is
  'Momento de la cancelación: apartado (pre-venta) o venta (estatus vendido*). Se conserva estatus_sembrado original.';
