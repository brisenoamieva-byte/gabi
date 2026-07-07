-- gabi · Bundle: aplicar una vez si 045_cadencia_perfilamiento.sql no está en remoto
-- Contenido: 045_cadencia_perfilamiento.sql

create table if not exists public.prospecto_cadencia (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null unique references public.prospectos (id) on delete cascade,
  desarrollo_id text not null,
  asesor_id text references public.asesores (id) on delete set null,
  started_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'expired')),
  paused_at timestamptz,
  pause_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospecto_cadencia_asesor_idx
  on public.prospecto_cadencia (asesor_id, desarrollo_id, status);

create index if not exists prospecto_cadencia_desarrollo_idx
  on public.prospecto_cadencia (desarrollo_id, status);

create table if not exists public.prospecto_cadencia_touches (
  id uuid primary key default gen_random_uuid(),
  cadencia_id uuid not null references public.prospecto_cadencia (id) on delete cascade,
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  touch_key text not null,
  day_offset smallint not null,
  sequence_in_day smallint not null,
  canal text not null check (canal in ('whatsapp', 'llamada')),
  label text not null,
  script_hint text,
  window_start_hour smallint,
  window_end_hour smallint,
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped', 'paused', 'expired')),
  completed_at timestamptz,
  completed_by text references public.asesores (id) on delete set null,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cadencia_id, touch_key)
);

create index if not exists prospecto_cadencia_touches_prospecto_idx
  on public.prospecto_cadencia_touches (prospecto_id, status, due_at);

create index if not exists prospecto_cadencia_touches_due_idx
  on public.prospecto_cadencia_touches (status, due_at)
  where status = 'pending';

alter table public.prospecto_cadencia enable row level security;
alter table public.prospecto_cadencia_touches enable row level security;

drop policy if exists prospecto_cadencia_service_all on public.prospecto_cadencia;
create policy prospecto_cadencia_service_all
  on public.prospecto_cadencia for all to service_role
  using (true) with check (true);

drop policy if exists prospecto_cadencia_touches_service_all on public.prospecto_cadencia_touches;
create policy prospecto_cadencia_touches_service_all
  on public.prospecto_cadencia_touches for all to service_role
  using (true) with check (true);

drop policy if exists prospecto_cadencia_admin_select on public.prospecto_cadencia;
create policy prospecto_cadencia_admin_select
  on public.prospecto_cadencia for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

drop policy if exists prospecto_cadencia_touches_admin_select on public.prospecto_cadencia_touches;
create policy prospecto_cadencia_touches_admin_select
  on public.prospecto_cadencia_touches for select
  using (
    exists (
      select 1 from public.prospecto_cadencia c
      where c.id = cadencia_id
        and public.admin_can_access_desarrollo(c.desarrollo_id)
    )
  );
