-- gabi · Etapa CRM "visita" (visita registrada al desarrollo), después de "cita"

alter table public.prospectos drop constraint if exists prospectos_etapa_check;

-- Quienes ya tienen visita realizada quedan en la nueva etapa
update public.prospectos
set
  etapa = 'visita',
  updated_at = now()
where etapa = 'cita'
  and visita_realizada_on is not null;

alter table public.prospectos
  add constraint prospectos_etapa_check check (
    etapa in (
      'nuevo',
      'contactado',
      'cita',
      'visita',
      'apartado',
      'vendido',
      'cancelado',
      'perdido'
    )
  );

comment on column public.prospectos.etapa is
  'Pipeline CRM: cita = agendada; visita = recorrida/registrada; perdido = descartado pre-apartado; cancelado = canceló apartado o venta.';

-- Playbook: cotización / perfil / seguimiento pasan a etapa visita;
-- el paso "recorrido" se confirma en cita y al completarlo avanza a visita.
update public.crm_playbook_configs
set
  steps = (
    select coalesce(
      jsonb_agg(
        case
          when step->>'id' = 'recorrido' then
            step
            || jsonb_build_object(
              'etapa', 'cita',
              'hint',
              'Confirma que el prospecto recorrió el desarrollo e indica la fecha. Al completar, el lead pasa a etapa Visita.'
            )
          when step->>'id' in (
            'necesidades-perfiladas',
            'necesidades',
            'cotizacion',
            'seguimiento-post-cotizacion',
            'seguimiento'
          ) then
            step || jsonb_build_object('etapa', 'visita')
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
