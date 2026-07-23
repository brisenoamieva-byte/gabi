-- gabi · Suscripciones Web Push de asesores + canal push en digest CRM
-- Ejecutar DESPUÉS de 079_lead_activity_score.sql

create table if not exists public.asesor_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  asesor_id text not null references public.asesores (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asesor_push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists asesor_push_subscriptions_asesor_idx
  on public.asesor_push_subscriptions (asesor_id);

comment on table public.asesor_push_subscriptions is
  'Endpoints Web Push (PWA) por asesor para recordatorios de pendientes CRM.';

alter table public.asesor_push_subscriptions enable row level security;

drop policy if exists asesor_push_subscriptions_service_all on public.asesor_push_subscriptions;
create policy asesor_push_subscriptions_service_all
  on public.asesor_push_subscriptions for all to service_role using (true) with check (true);

-- Ampliar canal del digest: email | whatsapp | push
alter table public.compliance_digest_log
  drop constraint if exists compliance_digest_log_channel_check;

alter table public.compliance_digest_log
  add constraint compliance_digest_log_channel_check
  check (channel in ('email', 'whatsapp', 'push'));
