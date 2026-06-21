-- gabi · Playbook Misión La Gavia + canal en digest de cumplimiento
-- Ejecutar DESPUÉS de 042_crm_compliance_digest.sql

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
