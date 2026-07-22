-- gabi · Playbook Misión La Gavia — versión moderna (8 hitos BBR)
-- Reemplaza el seed legacy de 043 (contacto-24h, etapa cotizo/negociacion).
-- Ejecutar DESPUÉS de 076_prospecto_first_contacted_at.sql

insert into public.crm_playbook_configs (desarrollo_id, enabled, block_etapa, steps, updated_at)
values
  (
    'mision-la-gavia',
    true,
    true,
    '[
      {"id":"whatsapp-inicial","etapa":"nuevo","label":"WhatsApp de bienvenida","hint":"Inmediato al recibir el lead (SLA 1 h). Presenta el desarrollo e invita a visita. Horarios: 9–11 h, 12–14 h, 17–19 h.","kind":"contacto","required":true,"order":10},
      {"id":"llamada-d0","etapa":"nuevo","label":"Primera llamada (mismo día)","hint":"Due operativo ~2 h después del WA; ventana SLA hasta 5 h. Si no contesta, deja buzón breve. Si no responde: sigue la cadencia de 10 toques en 8 días (D0 WA+llamada, D1, pausa D2, D3, D4, pausa D5–6, D7 cierre). Tras el último intento, valora Descartado; no se mueve solo.","kind":"contacto","required":true,"order":20},
      {"id":"datos-completos","etapa":"nuevo","label":"Teléfono registrado","hint":"Con el teléfono basta para avanzar a Contactado. El email es opcional.","kind":"contacto","required":true,"order":30},
      {"id":"visita-agendada","etapa":"contactado","label":"Cita agendada en el desarrollo","hint":"Programa la visita con fecha y horario. Si ya está en sitio (pase), marca «Visita al desarrollo realizada» — no hace falta agendar antes.","kind":"manual","required":true,"order":40},
      {"id":"recorrido","etapa":"cita","label":"Visita al desarrollo realizada","hint":"Confirma la visita y sigue el proceso in-situ: confianza → necesidades → producto → cierre. Indica la fecha del recorrido.","kind":"manual","required":true,"order":50},
      {"id":"necesidades-perfiladas","etapa":"visita","label":"Necesidades y perfil documentados","hint":"Obligatorio en Visita. Documenta torre, modelo (2R/3R) y nivel. El perfilamiento (presupuesto, decisión, intención) define la calificación A/B/C.","kind":"manual","required":true,"order":60},
      {"id":"cotizacion","etapa":"visita","label":"Cotización enviada al cliente","hint":"Envía la cotización con el simulador Gavia (contado, libre o MSI). Se completa sola al guardar desde el cotizador; también puedes marcarla desde Contactado.","kind":"manual","required":true,"order":70},
      {"id":"seguimiento-post-cotizacion","etapa":"visita","label":"Seguimiento documentado en notas","hint":"Próximo contacto, objeciones y decisión (negociación dentro de la etapa visita).","kind":"manual","required":true,"order":80}
    ]'::jsonb,
    now()
  )
on conflict (desarrollo_id) do update set
  enabled = excluded.enabled,
  block_etapa = excluded.block_etapa,
  steps = excluded.steps,
  updated_at = excluded.updated_at;
