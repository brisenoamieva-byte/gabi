-- Cuestionario obligatorio al marcar salida de guardia

create table if not exists public.guardia_salida_cuestionarios (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.guardia_asignaciones (id) on delete cascade,
  marcaje_id uuid references public.guardia_marcajes (id) on delete set null,
  asesor_id text not null references public.asesores (id) on delete restrict,
  desarrollo_id text not null,
  fecha date not null,
  turno text not null check (turno in ('matutino', 'vespertino')),
  atendio_citas_visitas boolean not null,
  created_at timestamptz not null default now(),
  unique (asignacion_id)
);

create table if not exists public.guardia_salida_prospectos (
  id uuid primary key default gen_random_uuid(),
  cuestionario_id uuid not null references public.guardia_salida_cuestionarios (id) on delete cascade,
  orden smallint not null default 1 check (orden > 0),
  tipo_prospecto text not null,
  nombre text not null,
  telefono text not null,
  email text not null,
  medio_contacto text not null,
  es_cross_selling boolean not null,
  perfil_presupuesto_disponible boolean not null,
  perfil_intencion_apartar boolean not null,
  perfil_decisor_visita boolean not null,
  comentarios_generales text not null,
  perfil_vio_publicidad_redes boolean not null,
  fecha_atencion date not null,
  perfil_calificacion_lead text check (perfil_calificacion_lead in ('A', 'B', 'C')),
  prospecto_id uuid references public.prospectos (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists guardia_salida_cuestionarios_desarrollo_fecha_idx
  on public.guardia_salida_cuestionarios (desarrollo_id, fecha desc);

create index if not exists guardia_salida_prospectos_cuestionario_idx
  on public.guardia_salida_prospectos (cuestionario_id, orden);

alter table public.guardia_salida_cuestionarios enable row level security;
alter table public.guardia_salida_prospectos enable row level security;

create policy guardia_salida_cuestionarios_service_all
  on public.guardia_salida_cuestionarios for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy guardia_salida_prospectos_service_all
  on public.guardia_salida_prospectos for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.guardia_salida_cuestionarios is
  'Cuestionario de salida de guardia: ¿atendió citas o visitas?';
comment on table public.guardia_salida_prospectos is
  'Prospectos o visitantes atendidos durante el turno de guardia.';
