-- gabi · Fecha de “contactar más adelante” en seguimiento de prospectos

alter table public.prospectos
  add column if not exists proximo_contacto_on date,
  add column if not exists proximo_contacto_nota text;

comment on column public.prospectos.proximo_contacto_on is
  'Fecha en que el prospecto pidió ser contactado de nuevo; genera recordatorio al asesor.';

comment on column public.prospectos.proximo_contacto_nota is
  'Nota opcional del motivo / contexto del contacto diferido.';

create index if not exists prospectos_proximo_contacto_asesor_idx
  on public.prospectos (asesor_id, proximo_contacto_on)
  where proximo_contacto_on is not null and activo = true;
