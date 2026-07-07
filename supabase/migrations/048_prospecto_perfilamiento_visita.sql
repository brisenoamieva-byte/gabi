-- Cuestionario post-visita (playbook: necesidades y perfil documentados)

alter table public.prospectos
  add column if not exists perfil_presupuesto_disponible boolean,
  add column if not exists perfil_intencion_apartar boolean,
  add column if not exists perfil_decisor_visita boolean,
  add column if not exists perfil_vio_publicidad_redes boolean;

comment on column public.prospectos.perfil_presupuesto_disponible is
  'Perfilamiento post-visita: presupuesto necesario y disponible.';
comment on column public.prospectos.perfil_intencion_apartar is
  'Perfilamiento post-visita: intención de apartar de inmediato.';
comment on column public.prospectos.perfil_decisor_visita is
  'Perfilamiento post-visita: quien visitó es el decisor de compra.';
comment on column public.prospectos.perfil_vio_publicidad_redes is
  'Perfilamiento post-visita: vio publicidad del desarrollo en redes.';
