-- gabi · Sembrado unificado: captación vs residencia, perfil cliente, contrato
-- Separar canal de captación de ciudad/residencia; perfil opcional; contrato firmado.

-- Prospectos: perfil demográfico + canal de captación
alter table public.prospectos
  add column if not exists origen_captacion text,
  add column if not exists edad integer,
  add column if not exists sexo text,
  add column if not exists ocupacion text;

comment on column public.prospectos.origen_captacion is
  'Canal de captación (Contacto Directo, Facebook, Pase…). Distinto de origen_ciudad (residencia).';

comment on column public.prospectos.origen_ciudad is
  'Lugar de residencia / ciudad del cliente.';

comment on column public.prospectos.edad is
  'Edad del cliente (opcional, sembrado / perfilamiento).';

comment on column public.prospectos.sexo is
  'Sexo del cliente (opcional): M, F u otro.';

comment on column public.prospectos.ocupacion is
  'Ocupación del cliente (opcional).';

-- Operaciones: mismo desglose + contrato
alter table public.operaciones_comerciales
  add column if not exists origen_captacion text,
  add column if not exists contrato_firmado boolean not null default false,
  add column if not exists contrato_firmado_at date;

comment on column public.operaciones_comerciales.origen_captacion is
  'Canal de captación del lead/venta (congelado en sembrado).';

comment on column public.operaciones_comerciales.contrato_firmado is
  'Indica si ya hay contrato firmado (columna Contrato del Excel).';

create index if not exists prospectos_origen_captacion_idx
  on public.prospectos (desarrollo_id, origen_captacion)
  where origen_captacion is not null;

create index if not exists operaciones_origen_captacion_idx
  on public.operaciones_comerciales (desarrollo_id, origen_captacion)
  where origen_captacion is not null;
