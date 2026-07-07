-- Recorrido en playbook: registro manual (no obligatorio vía módulo GABI)

update public.crm_playbook_configs
set
  steps = (
    select jsonb_agg(
      case
        when step->>'id' = 'recorrido' then
          step
          || jsonb_build_object(
            'kind', 'manual',
            'hint',
            'Registra la visita presencial cuando el cliente recorrió el desarrollo e indica la fecha. No es obligatorio usar el módulo de recorrido de GABI.'
          )
        else step
      end
      order by (step->>'order')::int
    )
    from jsonb_array_elements(steps) as step
  ),
  updated_at = now()
where steps @> '[{"id":"recorrido"}]'::jsonb;
