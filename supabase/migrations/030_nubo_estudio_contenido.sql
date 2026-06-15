-- gabi · Contenido e imágenes editables — estudio NUBO
-- Ejecutar DESPUÉS de 029_nubo_estudio_publicidad.sql

alter table public.nubo_estudio_publicidad
  add column if not exists contenido jsonb,
  add column if not exists media jsonb;

comment on column public.nubo_estudio_publicidad.contenido is
  'Textos del estudio NUBO (portada, diagnóstico, condiciones, slides).';

comment on column public.nubo_estudio_publicidad.media is
  'URLs y captions de imágenes del estudio NUBO.';
