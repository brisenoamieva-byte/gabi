-- gabi · Partners (inmobiliarias / asesores externos) por comercializadora
-- Atribución de leads de alianzas; no confundir con asesores internos.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  comercializadora_id text not null references public.comercializadoras (id) on delete restrict,
  tipo text not null default 'inmobiliaria'
    check (tipo in ('inmobiliaria', 'asesor_externo', 'otro')),
  nombre text not null,
  contacto_nombre text,
  telefono text,
  email text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_comercializadora_activo_idx
  on public.partners (comercializadora_id, activo, nombre);

alter table public.prospectos
  add column if not exists partner_id uuid references public.partners (id) on delete set null;

create index if not exists prospectos_partner_idx
  on public.prospectos (partner_id);

alter table public.partners enable row level security;

-- Lectura/escritura vía service role en APIs admin; políticas defensivas por desarrollo de la comercializadora.
create policy "partners_admin_select"
  on public.partners for select
  using (
    exists (
      select 1
      from public.desarrollos_catalog d
      where d.comercializadora_id = partners.comercializadora_id
        and public.admin_can_access_desarrollo(d.id)
    )
  );

create policy "partners_admin_write"
  on public.partners for all
  using (
    exists (
      select 1
      from public.desarrollos_catalog d
      where d.comercializadora_id = partners.comercializadora_id
        and public.admin_can_access_desarrollo(d.id)
    )
  );

comment on table public.partners is
  'Inmobiliarias y asesores externos con alianza firmada (por comercializadora).';

comment on column public.prospectos.partner_id is
  'Aliado (inmobiliaria / asesor externo) que originó el prospecto.';
