-- Overrides editables del catálogo corredor sur (/corredor/*)

create table if not exists public.corredor_desarrollo_overrides (
  desarrollo_id text primary key,
  overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

comment on table public.corredor_desarrollo_overrides is
  'Precios, textos de venta y visibilidad editables del corredor sur. El catálogo base sigue en zona-sur-seed.ts.';

alter table public.corredor_desarrollo_overrides enable row level security;

create policy corredor_desarrollo_overrides_read_authenticated
  on public.corredor_desarrollo_overrides
  for select
  to authenticated
  using (true);

create policy corredor_desarrollo_overrides_service_all
  on public.corredor_desarrollo_overrides
  for all
  to service_role
  using (true)
  with check (true);
