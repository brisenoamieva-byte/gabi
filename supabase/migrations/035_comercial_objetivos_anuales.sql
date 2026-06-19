-- gabi · Objetivos comerciales anuales por desarrollo/segmento (reporte semanal)

create table if not exists public.comercial_objetivos_anuales (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  segmento_id text not null,
  anio int not null check (anio >= 2020 and anio <= 2100),
  ventas_unidades numeric not null default 0,
  apartados_objetivo numeric not null default 0,
  ingresos_totales numeric not null default 0,
  ingresos_mes numeric not null default 0,
  precio_m2_objetivo numeric not null default 0,
  total_unidades int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (desarrollo_id, segmento_id, anio)
);

create index if not exists comercial_objetivos_desarrollo_anio_idx
  on public.comercial_objetivos_anuales (desarrollo_id, anio);

alter table public.comercial_objetivos_anuales enable row level security;

create policy "comercial_objetivos_admin_select"
  on public.comercial_objetivos_anuales for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "comercial_objetivos_admin_write"
  on public.comercial_objetivos_anuales for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

comment on table public.comercial_objetivos_anuales is
  'Metas comerciales anuales por segmento (reporte semanal Pasaje y similares).';

-- Seed Pasaje Álamos 2026 (migrado desde objetivos-config.ts)
insert into public.comercial_objetivos_anuales (
  desarrollo_id,
  segmento_id,
  anio,
  ventas_unidades,
  apartados_objetivo,
  ingresos_totales,
  ingresos_mes,
  precio_m2_objetivo,
  total_unidades
) values
  (
    'pasaje-alamos',
    'departamentos',
    2026,
    72,
    74.5,
    572000000,
    8100000,
    52540,
    81
  ),
  (
    'pasaje-alamos',
    'oficinas',
    2026,
    52,
    54,
    302795372,
    4700000,
    60758,
    57
  )
on conflict (desarrollo_id, segmento_id, anio) do nothing;
