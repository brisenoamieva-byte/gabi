-- gabi · Campos de lead compatibles con export Xperience/Investti
-- Ejecutar DESPUÉS de 019_campanas.sql

alter table public.prospectos
  add column if not exists xperience_id bigint,
  add column if not exists producto_nombre text,
  add column if not exists calificacion text,
  add column if not exists iscore integer,
  add column if not exists seller_score integer,
  add column if not exists asignado_por text,
  add column if not exists bandera_correo integer not null default 0,
  add column if not exists bandera_llamada integer not null default 0,
  add column if not exists bandera_whatsapp integer not null default 0,
  add column if not exists bandera_crm integer not null default 0,
  add column if not exists es_spam boolean not null default false,
  add column if not exists es_duplicado boolean not null default false,
  add column if not exists adryo_url text;

create unique index if not exists prospectos_xperience_id_idx
  on public.prospectos (xperience_id)
  where xperience_id is not null;

create index if not exists prospectos_spam_idx
  on public.prospectos (desarrollo_id, es_spam, created_at desc);

create index if not exists prospectos_calificacion_idx
  on public.prospectos (desarrollo_id, calificacion);

comment on column public.prospectos.xperience_id is
  'ID numérico del lead en Xperience/Investti (importación).';
comment on column public.prospectos.producto_nombre is
  'Nombre del producto/desarrollo en Xperience cuando difiere del catálogo GABI.';
comment on column public.prospectos.calificacion is
  'Calificación comercial Xperience (Sin Calificar, Activo / Interesado, Descartado / …).';
