-- gabi · Marcajes de entrada/salida en caseta (geolocalización)

create table if not exists public.guardia_caseta_config (
  desarrollo_id text primary key,
  lat double precision not null,
  lng double precision not null,
  radio_metros integer not null default 100 check (radio_metros > 0 and radio_metros <= 500),
  etiqueta text,
  updated_at timestamptz not null default now()
);

comment on table public.guardia_caseta_config is
  'Ubicación de la caseta de ventas por desarrollo para validar marcajes GPS.';

insert into public.guardia_caseta_config (desarrollo_id, lat, lng, radio_metros, etiqueta)
values (
  'mision-la-gavia',
  20.5547,
  -100.4359,
  100,
  'Caseta ventas · Plaza Citadina (Paseo Constituyentes, El Pueblito)'
)
on conflict (desarrollo_id) do nothing;

create table if not exists public.guardia_marcajes (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.guardia_asignaciones (id) on delete cascade,
  asesor_id text not null references public.asesores (id) on delete restrict,
  desarrollo_id text not null,
  fecha date not null,
  turno text not null check (turno in ('matutino', 'vespertino')),
  tipo text not null check (tipo in ('entrada', 'salida')),
  registrado_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  accuracy_metros double precision,
  distancia_metros double precision not null,
  dentro_radio boolean not null,
  unique (asignacion_id, tipo)
);

create index if not exists guardia_marcajes_desarrollo_fecha_idx
  on public.guardia_marcajes (desarrollo_id, fecha desc);

create index if not exists guardia_marcajes_asesor_fecha_idx
  on public.guardia_marcajes (asesor_id, fecha desc);

alter table public.guardia_caseta_config enable row level security;
alter table public.guardia_marcajes enable row level security;

create policy guardia_caseta_config_service_all
  on public.guardia_caseta_config for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy guardia_marcajes_service_all
  on public.guardia_marcajes for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.guardia_marcajes is
  'Entrada y salida obligatorias por turno de guardia, con GPS y distancia a caseta.';
