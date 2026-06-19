-- Pegar en Supabase SQL Editor (una sola query) si no tienes SUPABASE_DB_URL local.
-- Incluye 037 (QA/Satisfacción) + 038 (Playbook CRM + seed piloto).

-- ===== 037_prospecto_qa_satisfaccion.sql =====

alter table public.prospectos
  add column if not exists qa_score numeric(4, 2),
  add column if not exists qa_responded_at timestamptz,
  add column if not exists qa_canal text check (
    qa_canal is null or qa_canal in ('whatsapp', 'email', 'sms', 'otro')
  ),
  add column if not exists satisfaccion_score numeric(4, 2),
  add column if not exists satisfaccion_responded_at timestamptz;

create table if not exists public.prospecto_encuestas (
  id uuid primary key default gen_random_uuid(),
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  desarrollo_id text not null,
  tipo text not null check (tipo in ('qa', 'satisfaccion')),
  canal text not null default 'whatsapp' check (
    canal in ('whatsapp', 'email', 'sms', 'otro')
  ),
  score numeric(4, 2) not null check (score >= 0 and score <= 10),
  comentario text,
  source text not null default 'webhook' check (
    source in ('adryo', 'webhook', 'manual', 'xperience')
  ),
  external_id text,
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists prospecto_encuestas_desarrollo_idx
  on public.prospecto_encuestas (desarrollo_id, tipo, responded_at desc);

create index if not exists prospecto_encuestas_prospecto_idx
  on public.prospecto_encuestas (prospecto_id, responded_at desc);

create unique index if not exists prospecto_encuestas_external_id_idx
  on public.prospecto_encuestas (external_id)
  where external_id is not null;

comment on table public.prospecto_encuestas is
  'Historial de encuestas QA y satisfacción (ADRYO / webhook / import manual).';

-- ===== 038_crm_playbook.sql =====

create table if not exists public.crm_playbook_configs (
  desarrollo_id text primary key,
  enabled boolean not null default true,
  block_etapa boolean not null default true,
  steps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

comment on table public.crm_playbook_configs is
  'Pasos de seguimiento por etapa CRM. Piloto: Pasaje Álamos y La Vista.';

create table if not exists public.prospecto_playbook_progress (
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  step_id text not null,
  completed_at timestamptz not null default now(),
  completed_by text references public.asesores (id) on delete set null,
  primary key (prospecto_id, step_id)
);

create index if not exists prospecto_playbook_progress_prospecto_idx
  on public.prospecto_playbook_progress (prospecto_id);

alter table public.crm_playbook_configs enable row level security;
alter table public.prospecto_playbook_progress enable row level security;

create policy crm_playbook_configs_read_authenticated
  on public.crm_playbook_configs for select to authenticated using (true);

create policy crm_playbook_configs_service_all
  on public.crm_playbook_configs for all to service_role using (true) with check (true);

create policy prospecto_playbook_progress_service_all
  on public.prospecto_playbook_progress for all to service_role using (true) with check (true);

insert into public.crm_playbook_configs (desarrollo_id, enabled, block_etapa, steps)
values
  (
    'pasaje-alamos',
    true,
    true,
    '[
      {"id":"contacto-24h","etapa":"nuevo","label":"Contactar en 24 h","hint":"Llamada, WhatsApp o mensaje de bienvenida.","kind":"manual","required":true,"order":10},
      {"id":"datos-completos","etapa":"nuevo","label":"Email y teléfono registrados","kind":"contacto","required":true,"order":20},
      {"id":"recorrido","etapa":"contactado","label":"Recorrido guiado realizado","hint":"Presenta desarrollo y producto en GABI.","kind":"recorrido","required":true,"order":30},
      {"id":"necesidades","etapa":"contactado","label":"Necesidades y producto identificado","hint":"Deptos u oficinas según perfil del cliente.","kind":"manual","required":true,"order":40},
      {"id":"cotizacion","etapa":"cotizo","label":"Cotización enviada al cliente","kind":"cotizacion","required":true,"order":50},
      {"id":"seguimiento","etapa":"negociacion","label":"Seguimiento documentado en notas","hint":"Próximo contacto, objeciones y decisión.","kind":"manual","required":true,"order":60}
    ]'::jsonb
  ),
  (
    'la-vista-residencial',
    true,
    true,
    '[
      {"id":"contacto-24h","etapa":"nuevo","label":"Contactar en 24 h","hint":"Llamada, WhatsApp o mensaje de bienvenida.","kind":"manual","required":true,"order":10},
      {"id":"datos-completos","etapa":"nuevo","label":"Email y teléfono registrados","kind":"contacto","required":true,"order":20},
      {"id":"recorrido","etapa":"contactado","label":"Recorrido guiado realizado","hint":"Presenta desarrollo y producto en GABI.","kind":"recorrido","required":true,"order":30},
      {"id":"necesidades","etapa":"contactado","label":"Necesidades y producto identificado","hint":"Cluster y tipología (Oliveto, Benevento, Volterra).","kind":"manual","required":true,"order":40},
      {"id":"cotizacion","etapa":"cotizo","label":"Cotización enviada al cliente","kind":"cotizacion","required":true,"order":50},
      {"id":"seguimiento","etapa":"negociacion","label":"Seguimiento documentado en notas","hint":"Próximo contacto, objeciones y decisión.","kind":"manual","required":true,"order":60}
    ]'::jsonb
  )
on conflict (desarrollo_id) do nothing;
