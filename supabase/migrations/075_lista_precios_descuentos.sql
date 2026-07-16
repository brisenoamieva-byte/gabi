-- Descuentos por esquema de pago en listas de precios (PDF comercial / admin).

alter table public.listas_precios
  add column if not exists descuentos_esquema jsonb not null default '[]'::jsonb;

comment on column public.listas_precios.descuentos_esquema is
  'Reglas de descuento por esquema: [{id, label, descuentoPct (fracción 0–1), incluirEnPdf, orden}].';
