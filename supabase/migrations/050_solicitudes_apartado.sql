-- Solicitudes de apartado: asesor solicita → gerente registra en sembrado

create table if not exists public.solicitudes_apartado (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  desarrollo_id text not null,
  asesor_id text not null references public.asesores (id) on delete restrict,
  unidad_id uuid references public.disponibilidad_unidades (id) on delete set null,
  cotizacion_id uuid references public.cotizaciones (id) on delete set null,
  notas text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'atendida', 'cancelada')),
  atendida_por uuid references public.admin_profiles (id) on delete set null,
  atendida_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitudes_apartado_desarrollo_estado_idx
  on public.solicitudes_apartado (desarrollo_id, estado, created_at desc);

create unique index if not exists solicitudes_apartado_prospecto_pendiente_idx
  on public.solicitudes_apartado (prospecto_id)
  where estado = 'pendiente';

comment on table public.solicitudes_apartado is
  'Cola de apartados solicitados por asesores; solo gerencia registra la operación en sembrado.';
