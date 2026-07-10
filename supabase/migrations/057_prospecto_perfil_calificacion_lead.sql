-- Calificación A/B/C del lead según perfilamiento post-visita (3 criterios)

alter table public.prospectos
  add column if not exists perfil_calificacion_lead text;

alter table public.prospectos
  drop constraint if exists prospectos_perfil_calificacion_lead_check;

alter table public.prospectos
  add constraint prospectos_perfil_calificacion_lead_check
  check (perfil_calificacion_lead is null or perfil_calificacion_lead in ('A', 'B', 'C'));

comment on column public.prospectos.perfil_calificacion_lead is
  'Calificación del lead tras perfilamiento: A (3 sí), B (2 sí), C (0-1 sí) en presupuesto, apartado y decisor.';
