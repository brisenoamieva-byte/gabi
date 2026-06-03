-- gabi · Campañas comerciales por desarrollo (atribución de leads)
-- Ejecutar DESPUÉS de 018_comercial_crm_sembrado.sql

create table if not exists public.campanas (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  nombre text not null,
  canal text,
  tipo text not null default 'online' check (tipo in ('online', 'offline')),
  parseur_email text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campanas_desarrollo_activo_idx
  on public.campanas (desarrollo_id, activo, nombre);

alter table public.prospectos
  add column if not exists campana_id uuid references public.campanas (id) on delete set null;

create index if not exists prospectos_campana_idx
  on public.prospectos (campana_id);

alter table public.campanas enable row level security;

create policy "campanas_admin_select"
  on public.campanas for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "campanas_admin_write"
  on public.campanas for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

comment on table public.campanas is
  'Campañas de captación por desarrollo (canal online/offline, Parseur, etc.).';
