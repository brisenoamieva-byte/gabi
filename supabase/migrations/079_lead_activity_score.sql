-- gabi · Score de lead por acciones (estilo Experience)
-- Ejecutar DESPUÉS de 078_asesores_solo_gavia.sql

alter table public.prospectos
  add column if not exists lead_activity_score integer not null default 0,
  add column if not exists lead_activity_score_detail jsonb not null default '[]'::jsonb;

create index if not exists prospectos_lead_activity_score_idx
  on public.prospectos (desarrollo_id, lead_activity_score desc);

comment on column public.prospectos.lead_activity_score is
  'Suma de puntos por acciones/señales Gabi (no reemplaza iscore Xperience).';
comment on column public.prospectos.lead_activity_score_detail is
  'Desglose [{id, label, points}] de acciones aplicadas al score.';

create table if not exists public.lead_score_actions (
  id text primary key,
  scope text not null default 'lead'
    check (scope in ('lead', 'asesor')),
  label text not null,
  hint text not null default '',
  points integer not null default 0,
  enabled boolean not null default true,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

comment on table public.lead_score_actions is
  'Catálogo de acciones configurables que suman al score de lead (o asesor en fase 2).';

alter table public.lead_score_actions enable row level security;

drop policy if exists lead_score_actions_read_authenticated on public.lead_score_actions;
create policy lead_score_actions_read_authenticated
  on public.lead_score_actions for select to authenticated using (true);

drop policy if exists lead_score_actions_service_all on public.lead_score_actions;
create policy lead_score_actions_service_all
  on public.lead_score_actions for all to service_role using (true) with check (true);

insert into public.lead_score_actions (id, scope, label, hint, points, enabled, sort_order)
values
  ('telefono-valido', 'lead', 'Teléfono válido', 'Aumenta score si el número tiene 10 dígitos MX.', 2, true, 10),
  ('email-valido', 'lead', 'Email válido', 'Aumenta score si el correo es válido para contacto.', 2, true, 20),
  ('telefono-y-email', 'lead', 'Teléfono y email', 'Aumenta score cuando el lead tiene ambos canales.', 2, true, 30),
  ('campana', 'lead', 'Origen con campaña', 'Aumenta score si el lead llegó ligado a una campaña digital.', 3, true, 40),
  ('contacto-rapido', 'lead', 'Primer contacto < 1 h', 'Aumenta score cuando el asesor contactó en menos de 1 hora.', 5, true, 50),
  ('whatsapp', 'lead', 'WhatsApp registrado', 'Aumenta score al completar toque WhatsApp (playbook o cadencia).', 3, true, 60),
  ('llamada', 'lead', 'Llamada registrada', 'Aumenta score al completar toque de llamada (playbook o cadencia).', 5, true, 70),
  ('cita-agendada', 'lead', 'Cita agendada', 'Aumenta score cuando hay visita agendada en el desarrollo.', 8, true, 80),
  ('visita-recorrido', 'lead', 'Visita / recorrido', 'Aumenta score cuando el prospecto recorrió el desarrollo.', 12, true, 90),
  ('perfil-a', 'lead', 'Perfilamiento A', 'Lead con 3 Sí en presupuesto, intención y decisor.', 10, true, 100),
  ('perfil-b', 'lead', 'Perfilamiento B', 'Lead con 2 Sí en presupuesto, intención y decisor.', 6, true, 110),
  ('perfil-c', 'lead', 'Perfilamiento C', 'Lead con 0–1 Sí en presupuesto, intención y decisor.', 2, true, 120),
  ('cotizacion', 'lead', 'Cotización enviada', 'Aumenta score cuando hay cotización o paso de cotización completo.', 10, true, 130),
  ('apartado', 'lead', 'Apartado', 'Aumenta score al llegar a etapa Apartado.', 15, true, 140),
  ('vendido', 'lead', 'Vendido', 'Aumenta score al llegar a etapa Vendido.', 20, true, 150)
on conflict (id) do nothing;
