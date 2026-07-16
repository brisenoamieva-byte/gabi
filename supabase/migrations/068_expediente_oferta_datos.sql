-- gabi · Datos KYC + plan de pagos para auto-llenar oferta / anexos
-- Ejecutar en Supabase SQL Editor si no usas el runner de migraciones.

alter table public.operaciones_comerciales
  add column if not exists cliente_kyc jsonb not null default '{}'::jsonb,
  add column if not exists plan_pago jsonb not null default '{}'::jsonb;

comment on column public.operaciones_comerciales.cliente_kyc is
  'Datos del oferente para Anexo A (CURP, RFC, INE, domicilio, etc.).';
comment on column public.operaciones_comerciales.plan_pago is
  'Plan de pagos estructurado para Anexo B (apartado, tramos, finiquito).';
