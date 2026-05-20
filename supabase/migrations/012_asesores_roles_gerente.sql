-- Roles comerciales: Gerente, Coordinador, Director (permisos amplios) y Asesor

alter table public.asesores drop constraint if exists asesores_rol_check;

update public.asesores
set rol = 'gerente'
where rol = 'admin';

alter table public.asesores add constraint asesores_rol_check
  check (rol in ('asesor', 'gerente', 'coordinador', 'director'));

comment on column public.asesores.rol is
  'Rol comercial: Asesor (campo) | Gerente, Coordinador, Director (permisos amplios en el desarrollo).';
