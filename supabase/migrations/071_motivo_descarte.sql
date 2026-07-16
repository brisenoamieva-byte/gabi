-- gabi · Motivo de descarte obligatorio (etapa perdido)

alter table public.prospectos
  add column if not exists motivo_descarte text,
  add column if not exists motivo_descarte_detalle text;

alter table public.prospectos
  drop constraint if exists prospectos_motivo_descarte_check;

alter table public.prospectos
  add constraint prospectos_motivo_descarte_check check (
    motivo_descarte is null
    or motivo_descarte in (
      'no_localizable',
      'datos_falsos',
      'es_proveedor',
      'falta_presupuesto',
      'buscaba_otro_producto',
      'compro_otro_lado',
      'no_le_interesa',
      'zona_ubicacion',
      'plazos_entrega',
      'financiamiento',
      'solo_informacion',
      'duplicado',
      'otro'
    )
  );

-- Backfill suave desde calificación Xperience
update public.prospectos
set motivo_descarte = case
  when lower(coalesce(calificacion, '')) like '%datos falsos%' then 'datos_falsos'
  when lower(coalesce(calificacion, '')) like '%no le interesa%' then 'no_le_interesa'
  else 'no_le_interesa'
end
where etapa = 'perdido'
  and motivo_descarte is null;

comment on column public.prospectos.motivo_descarte is
  'Motivo estructurado de descarte (etapa perdido). Obligatorio al descartar.';

comment on column public.prospectos.motivo_descarte_detalle is
  'Detalle libre (ej. dónde compró, texto de “Otro”).';

create index if not exists prospectos_motivo_descarte_idx
  on public.prospectos (desarrollo_id, motivo_descarte)
  where etapa = 'perdido' and motivo_descarte is not null;
