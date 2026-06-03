-- gabi · Nivel de interés comercial (paridad Xperience)
-- Ejecutar DESPUÉS de 020_xperience_lead_fields.sql

alter table public.prospectos
  add column if not exists nivel_interes text;

create index if not exists prospectos_nivel_interes_idx
  on public.prospectos (desarrollo_id, nivel_interes);

comment on column public.prospectos.nivel_interes is
  'Nivel de interés comercial: sin_interes, bajo, alto (paridad Xperience).';
