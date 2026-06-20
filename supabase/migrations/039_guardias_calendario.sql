-- gabi · Calendario de guardias en oficina de ventas (gerente por desarrollo)

create table if not exists public.guardia_asignaciones (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  asesor_id text not null references public.asesores (id) on delete restrict,
  fecha date not null,
  turno text not null check (turno in ('matutino', 'vespertino')),
  estado text not null default 'borrador' check (estado in ('borrador', 'publicada')),
  notas text,
  creado_por_admin_id uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (desarrollo_id, fecha, turno)
);

create index if not exists guardia_asignaciones_desarrollo_fecha_idx
  on public.guardia_asignaciones (desarrollo_id, fecha);

create index if not exists guardia_asignaciones_asesor_fecha_idx
  on public.guardia_asignaciones (asesor_id, fecha);

alter table public.guardia_asignaciones enable row level security;

create policy "guardia_asignaciones_service_all"
  on public.guardia_asignaciones for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.guardia_asignaciones is
  'Guardias de oficina: matutino 10–15h, vespertino 15–20h. Una asesor por turno/día/desarrollo.';
