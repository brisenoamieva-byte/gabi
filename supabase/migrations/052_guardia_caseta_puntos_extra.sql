-- gabi · Múltiples puntos GPS válidos por desarrollo (oficina + obra)

alter table public.guardia_caseta_config
  add column if not exists puntos_extra jsonb not null default '[]'::jsonb;

comment on column public.guardia_caseta_config.puntos_extra is
  'Puntos adicionales válidos para marcaje GPS [{ lat, lng, radio_metros, etiqueta }].';

update public.guardia_caseta_config
set
  lat = 20.5936759,
  lng = -100.3762195,
  radio_metros = 100,
  etiqueta = 'Oficina comercial · BBR Habitarea (Pasaje Álamos)',
  puntos_extra = jsonb_build_array(
    jsonb_build_object(
      'lat', 20.6046377,
      'lng', -100.3799446,
      'radio_metros', 100,
      'etiqueta', 'Obra · Av. Industrialización #09, Álamos 2ª Secc.'
    )
  ),
  updated_at = now()
where desarrollo_id = 'pasaje-alamos';
