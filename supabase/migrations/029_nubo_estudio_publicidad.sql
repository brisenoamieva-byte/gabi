-- gabi · Presupuesto de publicidad editable — estudio NUBO
-- Ejecutar DESPUÉS de 028_investti_simulador.sql

create table if not exists public.nubo_estudio_publicidad (
  id text primary key default 'activo',
  partidas jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

comment on table public.nubo_estudio_publicidad is
  'Partidas mensuales del presupuesto de publicidad NUBO (estudio /estudios/nubo).';

alter table public.nubo_estudio_publicidad enable row level security;

create policy nubo_estudio_publicidad_read_authenticated
  on public.nubo_estudio_publicidad
  for select
  to authenticated
  using (true);

create policy nubo_estudio_publicidad_service_all
  on public.nubo_estudio_publicidad
  for all
  to service_role
  using (true)
  with check (true);
