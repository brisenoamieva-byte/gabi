-- Ejecutar una vez en Supabase SQL Editor (042 + 043 en un solo paso).
-- También: npm run db:apply:042 && npm run db:apply:043

-- --- 042_crm_compliance_digest.sql ---

create table if not exists public.compliance_digest_log (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  recipient_type text not null check (recipient_type in ('asesor', 'gerente')),
  recipient_id text not null,
  email text not null,
  overdue_count integer not null default 0,
  exception_count integer not null default 0,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists compliance_digest_log_desarrollo_sent_idx
  on public.compliance_digest_log (desarrollo_id, recipient_type, recipient_id, sent_at desc);

comment on table public.compliance_digest_log is
  'Registro de emails de cumplimiento CRM enviados a asesores y gerentes.';

alter table public.compliance_digest_log enable row level security;

create policy compliance_digest_log_service_all
  on public.compliance_digest_log for all to service_role using (true) with check (true);

-- --- 043_crm_compliance_gavia.sql ---

alter table public.compliance_digest_log
  add column if not exists channel text not null default 'email'
    check (channel in ('email', 'whatsapp'));

create index if not exists compliance_digest_log_channel_sent_idx
  on public.compliance_digest_log (desarrollo_id, channel, recipient_id, sent_at desc);

insert into public.crm_playbook_configs (desarrollo_id, enabled, block_etapa, steps)
values
  (
    'mision-la-gavia',
    true,
    true,
    '[
      {"id":"contacto-24h","etapa":"nuevo","label":"Contactar en 24 h","hint":"Llamada, WhatsApp o mensaje de bienvenida.","kind":"manual","required":true,"order":10},
      {"id":"datos-completos","etapa":"nuevo","label":"Email y teléfono registrados","kind":"contacto","required":true,"order":20},
      {"id":"recorrido","etapa":"contactado","label":"Recorrido guiado realizado","hint":"Presenta desarrollo y producto en GABI.","kind":"recorrido","required":true,"order":30},
      {"id":"necesidades","etapa":"contactado","label":"Necesidades y producto identificado","hint":"Torre, modelo (2R/3R) y nivel según perfil del cliente.","kind":"manual","required":true,"order":40},
      {"id":"cotizacion","etapa":"cotizo","label":"Cotización enviada al cliente","kind":"cotizacion","required":true,"order":50},
      {"id":"seguimiento","etapa":"negociacion","label":"Seguimiento documentado en notas","hint":"Próximo contacto, objeciones y decisión.","kind":"manual","required":true,"order":60}
    ]'::jsonb
  )
on conflict (desarrollo_id) do nothing;
