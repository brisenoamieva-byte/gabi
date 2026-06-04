-- gabi · Alinear solicitudes_comision si se aplicó por error el 023 deprecado
-- Ejecutar DESPUÉS de 023_expediente_comisiones.sql (canónico)

alter table public.solicitudes_comision
  add column if not exists precio_venta numeric,
  add column if not exists monto_comision_total numeric,
  add column if not exists notas text,
  add column if not exists motivo_rechazo text,
  add column if not exists autorizado_por uuid references public.admin_profiles (id) on delete set null,
  add column if not exists autorizado_at timestamptz,
  add column if not exists facturado_at timestamptz;

-- Renombrar columnas legacy del borrador 023 (si existen)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'precio_base'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'precio_venta'
  ) then
    alter table public.solicitudes_comision rename column precio_base to precio_venta;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'monto_comision'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'monto_comision_total'
  ) then
    alter table public.solicitudes_comision rename column monto_comision to monto_comision_total;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'notas_solicitud'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'notas'
  ) then
    alter table public.solicitudes_comision rename column notas_solicitud to notas;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'resuelto_por'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'autorizado_por'
  ) then
    alter table public.solicitudes_comision rename column resuelto_por to autorizado_por;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'resuelto_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'autorizado_at'
  ) then
    alter table public.solicitudes_comision rename column resuelto_at to autorizado_at;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'notas_resolucion'
  ) then
    update public.solicitudes_comision
    set motivo_rechazo = notas_resolucion
    where motivo_rechazo is null
      and notas_resolucion is not null
      and estado = 'rechazada';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitudes_comision'
      and column_name = 'monto_solicitado'
      and is_nullable = 'YES'
  ) then
    update public.solicitudes_comision
    set monto_solicitado = 0
    where monto_solicitado is null;
    alter table public.solicitudes_comision
      alter column monto_solicitado set not null;
  end if;
end $$;

alter table public.solicitudes_comision
  drop column if exists notas_resolucion,
  drop column if exists expediente_formalizado,
  drop column if exists enganche_cubierto;

comment on table public.solicitudes_comision is
  'Solicitudes de facturación de comisión (esquema GABI: precio_venta, monto_comision_total).';
