-- gabi · Log de captura automática de leads (Parseur, etc.)
-- Ejecutar DESPUÉS de 023_expediente_comisiones.sql (o última migración aplicada)

create table if not exists public.lead_captura_logs (
  id uuid primary key default gen_random_uuid(),
  fuente text not null default 'parseur',
  status text not null check (
    status in ('created', 'updated', 'duplicate', 'ignored', 'rejected', 'error')
  ),
  desarrollo_id text not null,
  campana_id uuid references public.campanas (id) on delete set null,
  prospecto_id uuid references public.prospectos (id) on delete set null,
  parseur_document_id text,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists lead_captura_logs_desarrollo_idx
  on public.lead_captura_logs (desarrollo_id, created_at desc);

create index if not exists lead_captura_logs_campana_idx
  on public.lead_captura_logs (campana_id, created_at desc);

alter table public.lead_captura_logs enable row level security;

create policy "lead_captura_logs_admin_select"
  on public.lead_captura_logs for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

comment on table public.lead_captura_logs is
  'Auditoría de webhooks de captura (Parseur → prospecto en GABI).';
