-- gabi · La Vista Residencial pausado: sin automatizaciones CRM ni correos

update public.desarrollos_catalog
set
  activo = false,
  updated_at = now()
where id = 'la-vista-residencial';

insert into public.crm_playbook_configs (desarrollo_id, enabled, block_etapa, steps)
values (
  'la-vista-residencial',
  false,
  true,
  '[]'::jsonb
)
on conflict (desarrollo_id) do update set
  enabled = false,
  updated_at = now();

comment on table public.desarrollos_catalog is
  'Catálogo de desarrollos. activo=false pausa automatizaciones GABI (crons, WA, cadencia).';
