-- Ejecutar una vez en Supabase SQL Editor si db:apply no corre automáticamente.
-- Contenido: 041_whatsapp_lead_notifications.sql

alter table public.campanas
  add column if not exists meta_lead_form_id text;

create index if not exists campanas_meta_lead_form_idx
  on public.campanas (meta_lead_form_id)
  where meta_lead_form_id is not null;

create table if not exists public.lead_carousel_state (
  desarrollo_id text not null,
  fecha date not null,
  last_asesor_id text references public.asesores (id) on delete set null,
  lead_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (desarrollo_id, fecha)
);

create table if not exists public.lead_contact_events (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid references public.prospectos (id) on delete set null,
  desarrollo_id text not null,
  canal text not null,
  destinatario_tipo text not null check (destinatario_tipo in ('prospecto', 'asesor')),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_contact_events_prospecto_idx
  on public.lead_contact_events (prospecto_id, created_at desc);

create index if not exists lead_contact_events_desarrollo_idx
  on public.lead_contact_events (desarrollo_id, created_at desc);

alter table public.lead_carousel_state enable row level security;
alter table public.lead_contact_events enable row level security;

drop policy if exists "lead_carousel_state_service_all" on public.lead_carousel_state;
create policy "lead_carousel_state_service_all"
  on public.lead_carousel_state for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "lead_contact_events_service_all" on public.lead_contact_events;
create policy "lead_contact_events_service_all"
  on public.lead_contact_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "lead_contact_events_admin_select" on public.lead_contact_events;
create policy "lead_contact_events_admin_select"
  on public.lead_contact_events for select
  using (public.admin_can_access_desarrollo(desarrollo_id));
