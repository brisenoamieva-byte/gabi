-- gabi · Checklist legal, enganche y solicitudes de comisión
-- Ejecutar DESPUÉS de 022_expediente_ventas.sql

alter table public.expediente_documentos
  add column if not exists checklist_codigo text,
  add column if not exists etapa_checklist text;

-- Migrar tipos legacy a códigos de checklist
update public.expediente_documentos
set checklist_codigo = case tipo
  when 'identificacion' then 'ID'
  when 'comprobante_domicilio' then 'DOM'
  when 'contrato' then 'CONTRATO'
  when 'solicitud_apartado' then 'OC'
  when 'comprobante_pago' then 'DEPOE'
  when 'rfc' then 'RFC'
  when 'escritura' then 'CONTRATO'
  else upper(tipo)
end
where checklist_codigo is null;

update public.expediente_documentos
set checklist_codigo = coalesce(checklist_codigo, tipo)
where checklist_codigo is null;

alter table public.expediente_documentos
  alter column checklist_codigo set default 'OTRO';

alter table public.expediente_documentos
  drop constraint if exists expediente_documentos_tipo_check;

drop index if exists public.expediente_documentos_operacion_tipo_activo_idx;

create unique index if not exists expediente_documentos_operacion_codigo_activo_idx
  on public.expediente_documentos (operacion_id, checklist_codigo)
  where activo = true and checklist_codigo not in ('OTRO', 'otro');

alter table public.expediente_documentos
  alter column tipo drop not null;

alter table public.operaciones_comerciales
  add column if not exists enganche_cubierto boolean not null default false,
  add column if not exists enganche_cubierto_at timestamptz,
  add column if not exists enganche_cubierto_por uuid references public.admin_profiles (id) on delete set null,
  add column if not exists expediente_formalizado boolean not null default false,
  add column if not exists expediente_formalizado_at timestamptz,
  add column if not exists expediente_formalizado_por uuid references public.admin_profiles (id) on delete set null,
  add column if not exists persona_moral boolean not null default false;

create table if not exists public.solicitudes_comision (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_comerciales (id) on delete cascade,
  desarrollo_id text not null,
  asesor_id text references public.asesores (id) on delete set null,
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'autorizada', 'rechazada', 'facturada')
  ),
  trigger_pago text not null check (
    trigger_pago in ('enganche_expediente', 'escrituracion', 'contado')
  ),
  comision_pct numeric,
  porcentaje_pago numeric not null,
  precio_venta numeric,
  monto_comision_total numeric,
  monto_solicitado numeric not null,
  notas text,
  motivo_rechazo text,
  solicitado_por uuid references public.admin_profiles (id) on delete set null,
  autorizado_por uuid references public.admin_profiles (id) on delete set null,
  autorizado_at timestamptz,
  facturado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitudes_comision_operacion_idx
  on public.solicitudes_comision (operacion_id, created_at desc);

create index if not exists solicitudes_comision_desarrollo_estado_idx
  on public.solicitudes_comision (desarrollo_id, estado, created_at desc);

alter table public.solicitudes_comision enable row level security;

create policy "solicitudes_comision_admin_select"
  on public.solicitudes_comision for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "solicitudes_comision_admin_write"
  on public.solicitudes_comision for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

comment on table public.solicitudes_comision is
  'Solicitudes de facturación de comisión por venta, sujetas a expediente y enganche.';
