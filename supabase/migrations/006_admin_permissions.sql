-- gabi · Permisos por rol y desarrollo
-- Ejecutar DESPUÉS de 005_documentos_prototipo.sql

alter table public.admin_profiles
  add column if not exists desarrollos_ids text[] not null default '{}';

-- Migrar roles existentes al nuevo modelo
alter table public.admin_profiles drop constraint if exists admin_profiles_rol_check;

update public.admin_profiles
set rol = 'superadmin'
where rol = 'admin';

update public.admin_profiles
set rol = 'gerente'
where rol = 'director';

alter table public.admin_profiles add constraint admin_profiles_rol_check
  check (rol in ('superadmin', 'gerente', 'operaciones'));

comment on column public.admin_profiles.desarrollos_ids is
  'Desarrollos asignados. Vacío + superadmin = acceso global. Gerente debe tener al menos uno.';

-- Helper SQL: ¿puede ver este desarrollo?
create or replace function public.admin_can_access_desarrollo(target_desarrollo_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.id = auth.uid()
      and ap.activo = true
      and (
        ap.rol = 'superadmin'
        or target_desarrollo_id = any (ap.desarrollos_ids)
      )
  );
$$;

-- RLS documentos: gerentes solo ven/editan sus desarrollos
drop policy if exists "documentos_admin_all" on public.documentos;
drop policy if exists "documentos_admin_select" on public.documentos;
drop policy if exists "documentos_admin_insert" on public.documentos;
drop policy if exists "documentos_admin_update" on public.documentos;
drop policy if exists "documentos_admin_delete" on public.documentos;

create policy "documentos_admin_select"
  on public.documentos for select
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.activo = true
        and (ap.rol = 'superadmin' or desarrollo_id = any (ap.desarrollos_ids))
    )
  );

create policy "documentos_admin_insert"
  on public.documentos for insert
  with check (public.admin_can_access_desarrollo(desarrollo_id));

create policy "documentos_admin_update"
  on public.documentos for update
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "documentos_admin_delete"
  on public.documentos for delete
  using (public.admin_can_access_desarrollo(desarrollo_id));

-- Inventario scoped
drop policy if exists "disponibilidad_admin_all" on public.disponibilidad_unidades;
drop policy if exists "disponibilidad_admin_select" on public.disponibilidad_unidades;
drop policy if exists "disponibilidad_admin_insert" on public.disponibilidad_unidades;
drop policy if exists "disponibilidad_admin_update" on public.disponibilidad_unidades;
drop policy if exists "disponibilidad_admin_delete" on public.disponibilidad_unidades;

create policy "disponibilidad_admin_select"
  on public.disponibilidad_unidades for select
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.activo = true
        and (ap.rol = 'superadmin' or desarrollo_id = any (ap.desarrollos_ids))
    )
  );

create policy "disponibilidad_admin_insert"
  on public.disponibilidad_unidades for insert
  with check (public.admin_can_access_desarrollo(desarrollo_id));

create policy "disponibilidad_admin_update"
  on public.disponibilidad_unidades for update
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "disponibilidad_admin_delete"
  on public.disponibilidad_unidades for delete
  using (public.admin_can_access_desarrollo(desarrollo_id));

-- Asesores: gerente solo ve asesores con overlap en desarrollos_ids
drop policy if exists "asesores_admin_all" on public.asesores;
drop policy if exists "asesores_admin_select" on public.asesores;
drop policy if exists "asesores_admin_write" on public.asesores;

create policy "asesores_admin_select"
  on public.asesores for select
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.activo = true
        and (
          ap.rol = 'superadmin'
          or (
            ap.rol = 'gerente'
            and desarrollos_ids && ap.desarrollos_ids
          )
        )
    )
  );

create policy "asesores_admin_write"
  on public.asesores for all
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.activo = true
        and ap.rol in ('superadmin', 'gerente')
        and (
          ap.rol = 'superadmin'
          or desarrollos_ids <@ ap.desarrollos_ids
        )
    )
  );

-- Superadmin lee todos los perfiles admin; cada quien lee el suyo
drop policy if exists "admin_profiles_self_read" on public.admin_profiles;
drop policy if exists "admin_profiles_read" on public.admin_profiles;
drop policy if exists "admin_profiles_superadmin_write" on public.admin_profiles;

create policy "admin_profiles_read"
  on public.admin_profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.rol = 'superadmin' and ap.activo = true
    )
  );

create policy "admin_profiles_superadmin_write"
  on public.admin_profiles for all
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.id = auth.uid() and ap.rol = 'superadmin' and ap.activo = true
    )
  );

-- Ejemplo: Ricardo (acceso total)
-- update public.admin_profiles
-- set rol = 'superadmin', desarrollos_ids = '{}'
-- where email = 'rbriseno@bbrhabitarea.com';

-- Ejemplo: gerente de La Vista Residencial
-- update public.admin_profiles
-- set rol = 'gerente', desarrollos_ids = array['la-vista-residencial']
-- where email = 'gerente.lavista@bbrhabitarea.com';
