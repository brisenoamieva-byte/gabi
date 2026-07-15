-- gabi · Oficina de ventas Misión La Gavia (marcajes GPS entrada/salida)

insert into public.guardia_caseta_config (desarrollo_id, lat, lng, radio_metros, etiqueta)
values (
  'mision-la-gavia',
  20.5407382,
  -100.4275012,
  100,
  'Oficina de ventas · Misión La Gavia'
)
on conflict (desarrollo_id) do update set
  lat = excluded.lat,
  lng = excluded.lng,
  radio_metros = excluded.radio_metros,
  etiqueta = excluded.etiqueta,
  updated_at = now();
