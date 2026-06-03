-- gabi · CRM comercial + sembrado de ventas (Pasaje Álamos y multi-desarrollo)
-- Ejecutar DESPUÉS de 017_pasaje_unidad_detalles.sql

-- Campos de lista de precios en inventario (F&F, Lista 4, etc.)
alter table public.disponibilidad_unidades
  add column if not exists lista_precios text,
  add column if not exists entregado boolean not null default false,
  add column if not exists escriturado boolean not null default false;

-- Prospectos (CRM post-visita / pre-apartado)
create table if not exists public.prospectos (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  nombre text not null,
  email text,
  telefono text,
  origen_ciudad text,
  medio_contacto text,
  medio_publicitario text,
  asesor_id text references public.asesores (id) on delete set null,
  promotor_nombre text,
  equipo_venta text,
  tipo_inversion text check (
    tipo_inversion is null
    or tipo_inversion in ('vivir', 'inversion', 'trabajar', 'otro')
  ),
  etapa text not null default 'nuevo' check (
    etapa in (
      'nuevo',
      'contactado',
      'cotizo',
      'negociacion',
      'apartado',
      'vendido',
      'perdido'
    )
  ),
  notas text,
  visita_id uuid references public.visitas_comerciales (id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospectos_desarrollo_etapa_idx
  on public.prospectos (desarrollo_id, etapa, updated_at desc);

create index if not exists prospectos_asesor_idx
  on public.prospectos (asesor_id, updated_at desc);

-- Cotizaciones guardadas (simulador / PDF)
create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  prospecto_id uuid references public.prospectos (id) on delete set null,
  asesor_id text references public.asesores (id) on delete set null,
  unidad_id uuid references public.disponibilidad_unidades (id) on delete set null,
  cluster_id text,
  prototipo_id text,
  unidad_numero text,
  tipo_unidad text check (
    tipo_unidad is null or tipo_unidad in ('departamento', 'oficina', 'casa', 'terreno')
  ),
  cliente_nombre text,
  precio_lista numeric,
  esquema_pago text,
  descuento_pct numeric,
  precio_total numeric,
  payload jsonb not null default '{}'::jsonb,
  pdf_generado_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cotizaciones_desarrollo_idx
  on public.cotizaciones (desarrollo_id, created_at desc);

create index if not exists cotizaciones_prospecto_idx
  on public.cotizaciones (prospecto_id, created_at desc);

-- Operaciones comerciales (sembrado)
create table if not exists public.operaciones_comerciales (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  unidad_id uuid not null references public.disponibilidad_unidades (id) on delete restrict,
  prospecto_id uuid references public.prospectos (id) on delete set null,
  cotizacion_id uuid references public.cotizaciones (id) on delete set null,
  estatus_sembrado text not null,
  cliente_nombre text not null,
  origen_ciudad text,
  equipo_venta text,
  promotor_nombre text,
  tipo_inversion text,
  lista_precios text,
  precio_lista numeric,
  descuento_pct numeric,
  precio_venta numeric,
  esquema_pago text,
  fecha_apartado date,
  fecha_cierre date,
  medio_publicitario text,
  observaciones_pagos text,
  observaciones text,
  entregado boolean not null default false,
  escriturado boolean not null default false,
  cancelada boolean not null default false,
  cancelada_at timestamptz,
  comprobacion numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operaciones_desarrollo_estatus_idx
  on public.operaciones_comerciales (desarrollo_id, estatus_sembrado, cancelada);

create index if not exists operaciones_unidad_idx
  on public.operaciones_comerciales (unidad_id, cancelada);

create unique index if not exists operaciones_unidad_activa_idx
  on public.operaciones_comerciales (unidad_id)
  where cancelada = false;

-- Cobranza mensual por operación
create table if not exists public.cobranza_mensual (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_comerciales (id) on delete cascade,
  mes date not null,
  monto numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (operacion_id, mes)
);

create index if not exists cobranza_operacion_idx
  on public.cobranza_mensual (operacion_id, mes);

-- RLS
alter table public.prospectos enable row level security;
alter table public.cotizaciones enable row level security;
alter table public.operaciones_comerciales enable row level security;
alter table public.cobranza_mensual enable row level security;

create policy "prospectos_admin_select"
  on public.prospectos for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "prospectos_admin_write"
  on public.prospectos for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "cotizaciones_admin_select"
  on public.cotizaciones for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "operaciones_admin_select"
  on public.operaciones_comerciales for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "operaciones_admin_write"
  on public.operaciones_comerciales for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "cobranza_admin_select"
  on public.cobranza_mensual for select
  using (
    exists (
      select 1
      from public.operaciones_comerciales o
      where o.id = operacion_id
        and public.admin_can_access_desarrollo(o.desarrollo_id)
    )
  );

create policy "cobranza_admin_write"
  on public.cobranza_mensual for all
  using (
    exists (
      select 1
      from public.operaciones_comerciales o
      where o.id = operacion_id
        and public.admin_can_access_desarrollo(o.desarrollo_id)
    )
  );

comment on table public.prospectos is
  'Prospectos comerciales para seguimiento CRM (post-recorrido / pre-apartado).';

comment on table public.cotizaciones is
  'Cotizaciones guardadas desde el simulador (snapshot + payload JSON).';

comment on table public.operaciones_comerciales is
  'Operaciones de venta / sembrado por unidad (apartado, venta, cobranza).';

comment on table public.cobranza_mensual is
  'Pagos mensuales reales por operación comercial.';
