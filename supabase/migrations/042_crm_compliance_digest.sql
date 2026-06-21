-- gabi · Log de digest de cumplimiento CRM (evita duplicados diarios)
-- Ejecutar DESPUÉS de 041_whatsapp_lead_notifications.sql

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
