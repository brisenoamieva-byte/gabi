-- Horario de la cita agendada (fecha ya en visita_agendada_on).

alter table public.prospectos
  add column if not exists visita_agendada_hora time;

comment on column public.prospectos.visita_agendada_hora is
  'Hora acordada de la visita al desarrollo (playbook visita-agendada), hora local México.';

-- Actualizar hint del paso en configs guardadas
update public.crm_playbook_configs
set
  steps = (
    select coalesce(
      jsonb_agg(
        case
          when step->>'id' = 'visita-agendada' then
            step
            || jsonb_build_object(
              'hint',
              'Programa la visita con el prospecto: fecha y horario.'
            )
          else step
        end
        order by (step->>'order')::int
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(steps) as step
  ),
  updated_at = now()
where steps is not null;
