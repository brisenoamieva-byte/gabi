-- gabi · Paso 1 — Fundación del panel admin
-- Ejecutar en Supabase: SQL Editor → New query → Run

-- Perfiles con acceso al panel admin (vinculados a auth.users)
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol text not null default 'admin' check (rol in ('admin', 'director', 'operaciones')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documentos comerciales (brochures, disponibilidad PDF, etc.)
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  cluster_id text,
  tipo text not null check (tipo in ('brochure_desarrollo', 'brochure_cluster', 'disponibilidad', 'otro')),
  nombre text not null,
  nombre_archivo text not null,
  storage_path text not null unique,
  public_url text not null,
  tamano_bytes bigint,
  subido_por uuid references public.admin_profiles (id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documentos_desarrollo_idx on public.documentos (desarrollo_id);
create index if not exists documentos_cluster_idx on public.documentos (cluster_id);
create index if not exists documentos_tipo_idx on public.documentos (tipo);

-- Inventario (preparado para paso 3 — import CSV)
create table if not exists public.disponibilidad_unidades (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  cluster_id text not null,
  unidad text not null,
  tipo text not null check (tipo in ('casa', 'departamento', 'terreno')),
  estatus text not null check (estatus in ('disponible', 'apartado', 'vendido', 'bloqueado')),
  prototipo_id text,
  precio numeric,
  superficie_m2 numeric,
  entrega text,
  etapa text,
  torre text,
  nivel text,
  nivel_orden int,
  notas text,
  activo boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (desarrollo_id, cluster_id, unidad)
);

create index if not exists disponibilidad_cluster_idx on public.disponibilidad_unidades (cluster_id, estatus);

-- Asesores (preparado para paso 4 — gestión desde admin)
create table if not exists public.asesores (
  id text primary key,
  nombre text not null,
  email text not null unique,
  pin_hash text not null,
  rol text not null default 'asesor' check (rol in ('asesor', 'admin', 'director')),
  activo boolean not null default true,
  desarrollos_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.admin_profiles enable row level security;
alter table public.documentos enable row level security;
alter table public.disponibilidad_unidades enable row level security;
alter table public.asesores enable row level security;

-- Solo admins autenticados leen/escriben documentos
create policy "admin_profiles_self_read"
  on public.admin_profiles for select
  using (auth.uid() = id and activo = true);

create policy "documentos_admin_all"
  on public.documentos for all
  using (
    exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

-- Lectura pública de documentos activos (asesores descargan sin login Supabase)
create policy "documentos_public_read"
  on public.documentos for select
  using (activo = true);

create policy "disponibilidad_admin_all"
  on public.disponibilidad_unidades for all
  using (
    exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

create policy "disponibilidad_public_read"
  on public.disponibilidad_unidades for select
  using (activo = true);

create policy "asesores_admin_all"
  on public.asesores for all
  using (
    exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

-- Storage bucket (ejecutar también en Storage → New bucket: gabi-documentos, public read)
-- insert into storage.buckets (id, name, public) values ('gabi-documentos', 'gabi-documentos', true);
