-- gabi · Presupuesto de publicidad / MKT por desarrollo

create table if not exists public.desarrollo_mkt_presupuesto (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  anio int not null check (anio >= 2020 and anio <= 2100),
  monto_autorizado numeric not null default 0 check (monto_autorizado >= 0),
  moneda text not null default 'MXN',
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (desarrollo_id, anio)
);

create index if not exists desarrollo_mkt_presupuesto_desarrollo_anio_idx
  on public.desarrollo_mkt_presupuesto (desarrollo_id, anio);

create table if not exists public.desarrollo_mkt_partida (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.desarrollo_mkt_presupuesto (id) on delete cascade,
  desarrollo_id text not null,
  segmento text not null,
  proveedor text,
  concepto text not null,
  tipo text not null default 'variable' check (tipo in ('fijo', 'variable')),
  cantidad numeric not null default 1,
  monto_autorizado numeric not null default 0 check (monto_autorizado >= 0),
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists desarrollo_mkt_partida_presupuesto_idx
  on public.desarrollo_mkt_partida (presupuesto_id, orden);

create index if not exists desarrollo_mkt_partida_desarrollo_idx
  on public.desarrollo_mkt_partida (desarrollo_id, segmento);

create table if not exists public.desarrollo_mkt_gasto (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  presupuesto_id uuid references public.desarrollo_mkt_presupuesto (id) on delete set null,
  partida_id uuid references public.desarrollo_mkt_partida (id) on delete set null,
  campana_id uuid references public.campanas (id) on delete set null,
  fecha_registro date not null default (current_date),
  fecha_factura date,
  fecha_pago date,
  proveedor text not null,
  descripcion text not null,
  factura_ref text,
  monto_sin_iva numeric not null default 0 check (monto_sin_iva >= 0),
  iva numeric not null default 0 check (iva >= 0),
  total numeric not null default 0 check (total >= 0),
  estatus text not null default 'pendiente'
    check (estatus in ('pendiente', 'pagada', 'cancelada')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists desarrollo_mkt_gasto_desarrollo_fecha_idx
  on public.desarrollo_mkt_gasto (desarrollo_id, fecha_registro);

create index if not exists desarrollo_mkt_gasto_presupuesto_idx
  on public.desarrollo_mkt_gasto (presupuesto_id, estatus);

create index if not exists desarrollo_mkt_gasto_partida_idx
  on public.desarrollo_mkt_gasto (partida_id);

alter table public.desarrollo_mkt_presupuesto enable row level security;
alter table public.desarrollo_mkt_partida enable row level security;
alter table public.desarrollo_mkt_gasto enable row level security;

create policy "desarrollo_mkt_presupuesto_admin_select"
  on public.desarrollo_mkt_presupuesto for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "desarrollo_mkt_presupuesto_admin_write"
  on public.desarrollo_mkt_presupuesto for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "desarrollo_mkt_partida_admin_select"
  on public.desarrollo_mkt_partida for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "desarrollo_mkt_partida_admin_write"
  on public.desarrollo_mkt_partida for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "desarrollo_mkt_gasto_admin_select"
  on public.desarrollo_mkt_gasto for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "desarrollo_mkt_gasto_admin_write"
  on public.desarrollo_mkt_gasto for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

comment on table public.desarrollo_mkt_presupuesto is
  'Presupuesto de publicidad autorizado por desarrollo y año.';
comment on table public.desarrollo_mkt_partida is
  'Partidas del presupuesto MKT (segmento, proveedor, concepto).';
comment on table public.desarrollo_mkt_gasto is
  'Gastos / facturas reales de publicidad por desarrollo.';
