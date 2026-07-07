-- Fechas de visita al desarrollo (agendada vs realizada) para seguimiento CRM.

alter table public.prospectos
  add column if not exists visita_agendada_on date,
  add column if not exists visita_realizada_on date;

comment on column public.prospectos.visita_agendada_on is
  'Fecha acordada de visita al desarrollo (playbook visita-agendada).';

comment on column public.prospectos.visita_realizada_on is
  'Fecha en que el prospecto realizó la visita presencial / recorrido.';
