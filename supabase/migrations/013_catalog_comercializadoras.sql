-- Fase 1: catálogo multi-tenant (comercializadoras, desarrollos, clusters, prototipos)

create table if not exists public.comercializadoras (
  id text primary key,
  slug text not null unique,
  nombre text not null,
  logo text,
  usuario text not null unique,
  color_primary text not null default '#13315C',
  color_accent text not null default '#2DD4BF',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.desarrollos_catalog (
  id text primary key,
  comercializadora_id text not null references public.comercializadoras (id) on delete restrict,
  nombre text not null,
  slug text not null,
  desarrollador text,
  ubicacion text,
  descripcion text,
  precio_desde numeric,
  tipos_producto text[] not null default '{}',
  estado text not null default 'activo' check (estado in ('activo', 'proximamente')),
  logo text,
  desarrollador_logo text,
  color_principal text,
  color_acento text,
  brochure_pdf text,
  crm jsonb not null default '{"provider":"none","enabled":false}'::jsonb,
  recorrido_etapas jsonb not null default '["Confianza","Necesidades","Desarrollo","Producto","Cierre"]'::jsonb,
  recorrido_version int not null default 2,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comercializadora_id, slug)
);

create index if not exists desarrollos_catalog_comercializadora_idx
  on public.desarrollos_catalog (comercializadora_id);

create table if not exists public.clusters_catalog (
  id text primary key,
  desarrollo_id text not null references public.desarrollos_catalog (id) on delete cascade,
  payload jsonb not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clusters_catalog_desarrollo_idx
  on public.clusters_catalog (desarrollo_id, activo);

create table if not exists public.prototipos_catalog (
  id text primary key,
  desarrollo_id text not null references public.desarrollos_catalog (id) on delete cascade,
  cluster_id text not null,
  payload jsonb not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prototipos_catalog_desarrollo_idx
  on public.prototipos_catalog (desarrollo_id, cluster_id, activo);

alter table public.comercializadoras enable row level security;
alter table public.desarrollos_catalog enable row level security;
alter table public.clusters_catalog enable row level security;
alter table public.prototipos_catalog enable row level security;

-- Lectura pública de catálogo activo (portal y APIs anónimas)
create policy "comercializadoras_public_read"
  on public.comercializadoras for select
  using (activo = true);

create policy "desarrollos_catalog_public_read"
  on public.desarrollos_catalog for select
  using (activo = true and estado = 'activo');

create policy "clusters_catalog_public_read"
  on public.clusters_catalog for select
  using (activo = true);

create policy "prototipos_catalog_public_read"
  on public.prototipos_catalog for select
  using (activo = true);

-- Escritura solo service role (seed/admin vía API server-side)
create policy "comercializadoras_service_write"
  on public.comercializadoras for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "desarrollos_catalog_service_write"
  on public.desarrollos_catalog for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "clusters_catalog_service_write"
  on public.clusters_catalog for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "prototipos_catalog_service_write"
  on public.prototipos_catalog for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
