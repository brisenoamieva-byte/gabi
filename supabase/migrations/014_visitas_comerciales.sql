-- gabi · Visitas comerciales (leads + recorridos completados)
-- Ejecutar DESPUÉS de 013_catalog_comercializadoras.sql

create table if not exists public.visitas_comerciales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lead_registrado', 'recorrido_completado')),
  desarrollo_id text not null,
  asesor_id text not null references public.asesores (id) on delete restrict,
  asesor_nombre text,
  cliente_nombre text,
  cliente_email text,
  cliente_telefono text,
  medio_contacto text,
  cluster_id text,
  cluster_nombre text,
  prototipo_id text,
  prototipo_nombre text,
  precio_final numeric,
  etapa_alcanzada int,
  crm_status text,
  crm_id text,
  payload jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists visitas_desarrollo_occurred_idx
  on public.visitas_comerciales (desarrollo_id, occurred_at desc);

create index if not exists visitas_asesor_occurred_idx
  on public.visitas_comerciales (asesor_id, occurred_at desc);

create index if not exists visitas_tipo_idx
  on public.visitas_comerciales (tipo, occurred_at desc);

alter table public.visitas_comerciales enable row level security;

create policy "visitas_admin_select"
  on public.visitas_comerciales for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

comment on table public.visitas_comerciales is
  'Eventos de visita comercial: registro de lead y recorrido completado. Insert vía API (service role).';
