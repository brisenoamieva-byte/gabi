-- gabi · Teléfono de contacto en asesores (paridad Xperience)

alter table public.asesores
  add column if not exists telefono text;

comment on column public.asesores.telefono is
  'Teléfono de contacto del asesor comercial (opcional).';
