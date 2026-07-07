-- Pipeline CRM: etapa "cotizo" → "cita" (visita realizada al desarrollo)

alter table public.prospectos drop constraint if exists prospectos_etapa_check;

update public.prospectos
set etapa = 'cita', updated_at = now()
where etapa = 'cotizo';

alter table public.prospectos
  add constraint prospectos_etapa_check check (
    etapa in (
      'nuevo',
      'contactado',
      'cita',
      'negociacion',
      'apartado',
      'vendido',
      'perdido'
    )
  );

-- Playbook: renombrar etapa en pasos guardados y reordenar flujo
update public.crm_playbook_configs
set
  steps = (
    select coalesce(
      jsonb_agg(
        case
          when step->>'id' = 'visita-agendada' then
            step
            || jsonb_build_object(
              'etapa', 'contactado',
              'label', 'Cita agendada en el desarrollo',
              'hint',
              'Programa la visita con el prospecto e indica la fecha. Próximamente: horarios según disponibilidad del asesor.'
            )
          when step->>'id' = 'recorrido' then
            step
            || jsonb_build_object(
              'etapa', 'cita',
              'label', 'Visita al desarrollo realizada',
              'hint',
              'Confirma que el prospecto recorrió el desarrollo e indica la fecha de la visita.'
            )
          when step->>'id' = 'necesidades-perfiladas' then
            step || jsonb_build_object('etapa', 'cita')
          when step->>'id' = 'cotizacion' then
            step
            || jsonb_build_object(
              'etapa', 'cita',
              'label', 'Cotización enviada al cliente',
              'hint',
              'Acción obligatoria del playbook (no es una etapa). Marca cuando el cliente recibió la cotización.'
            )
          when step->>'etapa' = 'cotizo' then
            step || jsonb_build_object('etapa', 'cita')
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
