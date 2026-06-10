-- gabi · Datos publicados del simulador Investti (lista + reglas)
-- Ejecutar DESPUÉS de 027_propuesta_accesos.sql

create table if not exists public.investti_simulador_datos (
  id text primary key default 'activo',
  source text not null,
  generated_at timestamptz not null,
  config jsonb not null,
  lotes jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

comment on table public.investti_simulador_datos is
  'Publicación vigente del simulador Grupo Investti: reglas, esquemas y lista de precios.';

alter table public.investti_simulador_datos enable row level security;

create policy investti_simulador_datos_read_authenticated
  on public.investti_simulador_datos
  for select
  to authenticated
  using (true);

create policy investti_simulador_datos_service_all
  on public.investti_simulador_datos
  for all
  to service_role
  using (true)
  with check (true);
