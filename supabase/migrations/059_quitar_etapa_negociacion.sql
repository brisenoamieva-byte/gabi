-- Pipeline CRM: quitar etapa "negociacion" (de cita pasa directo a apartado)

alter table public.prospectos drop constraint if exists prospectos_etapa_check;

update public.prospectos
set etapa = 'cita', updated_at = now()
where etapa = 'negociacion';

alter table public.prospectos
  add constraint prospectos_etapa_check check (
    etapa in (
      'nuevo',
      'contactado',
      'cita',
      'apartado',
      'vendido',
      'perdido'
    )
  );

-- Playbook: seguimiento post-cotización queda en etapa cita
update public.crm_playbook_configs
set
  steps = (
    select coalesce(
      jsonb_agg(
        case
          when step->>'id' in ('seguimiento-post-cotizacion', 'seguimiento') then
            step || jsonb_build_object('etapa', 'cita')
          when step->>'etapa' = 'negociacion' then
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
