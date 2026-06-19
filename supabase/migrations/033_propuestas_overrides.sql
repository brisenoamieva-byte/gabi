-- Overrides editables de propuestas comerciales (meta, narrativa, condiciones BBR)

create table if not exists public.propuestas_overrides (
  slug text primary key,
  estado text,
  meta jsonb,
  narrativa jsonb,
  propuesta_bbr jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

comment on table public.propuestas_overrides is
  'Textos y condiciones editables de propuestas comerciales (/propuestas/*). Los lotes y escenarios siguen en código generado.';

alter table public.propuestas_overrides enable row level security;

create policy propuestas_overrides_read_authenticated
  on public.propuestas_overrides
  for select
  to authenticated
  using (true);

create policy propuestas_overrides_service_all
  on public.propuestas_overrides
  for all
  to service_role
  using (true)
  with check (true);
