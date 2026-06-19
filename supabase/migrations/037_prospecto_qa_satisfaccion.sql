-- gabi · Encuestas QA / Satisfacción (integración ADRYO / WhatsApp)
-- Ejecutar DESPUÉS de 036_asesores_telefono.sql

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
