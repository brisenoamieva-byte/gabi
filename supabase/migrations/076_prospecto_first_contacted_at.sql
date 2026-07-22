-- gabi · Speed-to-lead: primer contacto del asesor (set-once)

alter table public.prospectos
  add column if not exists first_contacted_at timestamptz;

alter table public.prospectos
  add column if not exists first_contacted_source text;

comment on column public.prospectos.first_contacted_at is
  'Primer toque del asesor al prospecto (set-once). Excluye WhatsApp automático del sistema.';

comment on column public.prospectos.first_contacted_source is
  'Origen del stamp: cadencia_*, playbook_*, etapa_avance, backfill_*.';

create index if not exists prospectos_first_contacted_at_idx
  on public.prospectos (desarrollo_id, first_contacted_at)
  where first_contacted_at is not null;

-- Backfill desde eventos de cadencia del asesor (excluye system_auto_wa).
update public.prospectos p
set
  first_contacted_at = sub.min_at,
  first_contacted_source = coalesce(p.first_contacted_source, 'backfill_cadencia_event')
from (
  select
    e.prospecto_id,
    min(e.created_at) as min_at
  from public.lead_contact_events e
  where e.prospecto_id is not null
    and e.destinatario_tipo = 'prospecto'
    and e.status = 'sent'
    and e.canal in ('cadencia_whatsapp', 'cadencia_llamada')
    and coalesce(e.payload->>'source', '') <> 'system_auto_wa'
  group by e.prospecto_id
) sub
where p.id = sub.prospecto_id
  and p.first_contacted_at is null;

-- Backfill complementario: pasos de contacto del playbook sin evento de cadencia.
update public.prospectos p
set
  first_contacted_at = sub.min_at,
  first_contacted_source = coalesce(p.first_contacted_source, 'backfill_playbook')
from (
  select
    pr.prospecto_id,
    min(pr.completed_at) as min_at
  from public.prospecto_playbook_progress pr
  where pr.step_id in ('whatsapp-inicial', 'llamada-d0', 'contacto-24h')
    and pr.completed_at is not null
  group by pr.prospecto_id
) sub
where p.id = sub.prospecto_id
  and p.first_contacted_at is null;
