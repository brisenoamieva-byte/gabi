-- Rol coordinador del desarrollo (mismos permisos comerciales que gerente)

alter table public.asesores drop constraint if exists asesores_rol_check;

alter table public.asesores add constraint asesores_rol_check
  check (rol in ('asesor', 'coordinador', 'admin', 'director'));

comment on column public.asesores.rol is
  'Rol comercial en el desarrollo: asesor, coordinador (equiv. gerente), director, admin.';
