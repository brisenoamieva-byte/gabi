-- Vincula perfiles admin provisionados desde coordinadores del portal

alter table public.admin_profiles
  add column if not exists asesor_id text references public.asesores (id) on delete set null;

create index if not exists admin_profiles_asesor_id_idx on public.admin_profiles (asesor_id);

comment on column public.admin_profiles.asesor_id is
  'Asesor portal vinculado cuando el perfil se creó automáticamente para un coordinador.';
