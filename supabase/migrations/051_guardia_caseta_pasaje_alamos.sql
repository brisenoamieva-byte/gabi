-- gabi · Caseta Pasaje Álamos para marcajes GPS de guardias

insert into public.guardia_caseta_config (desarrollo_id, lat, lng, radio_metros, etiqueta)
values (
  'pasaje-alamos',
  20.6046377,
  -100.3799446,
  100,
  'Caseta ventas · Pasaje Álamos (Av. Industrialización #09, Álamos 2ª Secc.)'
)
on conflict (desarrollo_id) do update set
  lat = excluded.lat,
  lng = excluded.lng,
  radio_metros = excluded.radio_metros,
  etiqueta = excluded.etiqueta,
  updated_at = now();
