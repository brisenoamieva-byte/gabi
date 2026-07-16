-- gabi · Etapa CRM "cancelado" (apartado/venta cancelada) ≠ de "perdido" (descartado pre-apartado)

alter table public.prospectos drop constraint if exists prospectos_etapa_check;

-- Quienes se marcaron como Descartado por cancelación de apartado → etapa cancelado
update public.prospectos
set
  etapa = 'cancelado',
  updated_at = now()
where etapa = 'perdido'
  and (
    calificacion = 'Descartado / Canceló apartado'
    or coalesce(notas, '') like '%[Apartó y canceló%'
  );

alter table public.prospectos
  add constraint prospectos_etapa_check check (
    etapa in (
      'nuevo',
      'contactado',
      'cita',
      'apartado',
      'vendido',
      'cancelado',
      'perdido'
    )
  );

comment on column public.prospectos.etapa is
  'Pipeline CRM: perdido = descartado pre-apartado; cancelado = canceló apartado o venta.';
