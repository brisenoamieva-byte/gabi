-- gabi · Fix RLS admin_profiles (recursión infinita tras 006)
-- Ejecutar si /admin redirige en loop o no carga tras login

create or replace function public.current_admin_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and activo = true
      and rol = 'superadmin'
  );
$$;

create or replace function public.current_admin_profile()
returns table (
  rol text,
  activo boolean,
  desarrollos_ids text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select ap.rol, ap.activo, ap.desarrollos_ids
  from public.admin_profiles ap
  where ap.id = auth.uid()
  limit 1;
$$;

drop policy if exists "admin_profiles_read" on public.admin_profiles;
drop policy if exists "admin_profiles_superadmin_write" on public.admin_profiles;
drop policy if exists "admin_profiles_self_read" on public.admin_profiles;
drop policy if exists "admin_profiles_superadmin_read_all" on public.admin_profiles;
drop policy if exists "admin_profiles_superadmin_insert" on public.admin_profiles;
drop policy if exists "admin_profiles_superadmin_update" on public.admin_profiles;
drop policy if exists "admin_profiles_superadmin_delete" on public.admin_profiles;

create policy "admin_profiles_self_read"
  on public.admin_profiles for select
  using (auth.uid() = id and activo = true);

create policy "admin_profiles_superadmin_read_all"
  on public.admin_profiles for select
  using (public.current_admin_is_superadmin());

create policy "admin_profiles_superadmin_insert"
  on public.admin_profiles for insert
  with check (public.current_admin_is_superadmin());

create policy "admin_profiles_superadmin_update"
  on public.admin_profiles for update
  using (public.current_admin_is_superadmin());

create policy "admin_profiles_superadmin_delete"
  on public.admin_profiles for delete
  using (public.current_admin_is_superadmin());

-- Documentos / inventario: usar función sin recursión
drop policy if exists "documentos_admin_select" on public.documentos;

create policy "documentos_admin_select"
  on public.documentos for select
  using (
    exists (
      select 1
      from public.current_admin_profile() cap
      where cap.activo = true
        and (cap.rol = 'superadmin' or desarrollo_id = any (cap.desarrollos_ids))
    )
  );

drop policy if exists "disponibilidad_admin_select" on public.disponibilidad_unidades;

create policy "disponibilidad_admin_select"
  on public.disponibilidad_unidades for select
  using (
    exists (
      select 1
      from public.current_admin_profile() cap
      where cap.activo = true
        and (cap.rol = 'superadmin' or desarrollo_id = any (cap.desarrollos_ids))
    )
  );

drop policy if exists "asesores_admin_select" on public.asesores;

create policy "asesores_admin_select"
  on public.asesores for select
  using (
    exists (
      select 1
      from public.current_admin_profile() cap
      where cap.activo = true
        and (
          cap.rol = 'superadmin'
          or (cap.rol = 'gerente' and desarrollos_ids && cap.desarrollos_ids)
        )
    )
  );

drop policy if exists "asesores_admin_write" on public.asesores;

create policy "asesores_admin_write"
  on public.asesores for all
  using (
    exists (
      select 1
      from public.current_admin_profile() cap
      where cap.activo = true
        and cap.rol in ('superadmin', 'gerente')
        and (
          cap.rol = 'superadmin'
          or desarrollos_ids <@ cap.desarrollos_ids
        )
    )
  );

-- Asegura rol superadmin para el dueño (ajusta email si aplica)
update public.admin_profiles
set rol = 'superadmin', desarrollos_ids = '{}'
where email = 'rbriseno@bbrhabitarea.com';
