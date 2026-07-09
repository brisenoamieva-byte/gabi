-- gabi · Tipo documento master_plan para plano general en recorrido
-- Ejecutar DESPUÉS de 055_desarrollo_hub_hero.sql

alter table public.documentos drop constraint if exists documentos_tipo_check;

alter table public.documentos add constraint documentos_tipo_check
  check (tipo in (
    'brochure_desarrollo',
    'brochure_cluster',
    'disponibilidad',
    'ficha_tecnica',
    'master_plan',
    'otro'
  ));

-- Documentos master plan subidos antes como «otro»
update public.documentos
set tipo = 'master_plan'
where tipo = 'otro'
  and (
    nombre ilike 'master plan%'
    or nombre ilike 'plano %'
  );
