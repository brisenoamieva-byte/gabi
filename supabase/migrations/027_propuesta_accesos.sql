-- Acceso privado a propuestas comerciales (enlace + código para desarrollador)

create table if not exists public.propuesta_accesos (
  id uuid primary key default gen_random_uuid(),
  propuesta_slug text not null,
  token text not null unique,
  codigo_hash text not null,
  activo boolean not null default true,
  titulo_cliente text,
  expires_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists propuesta_accesos_slug_idx on public.propuesta_accesos (propuesta_slug);
create index if not exists propuesta_accesos_token_idx on public.propuesta_accesos (token);

create unique index if not exists propuesta_accesos_slug_activo_uidx
  on public.propuesta_accesos (propuesta_slug)
  where activo = true;

alter table public.propuesta_accesos enable row level security;

comment on table public.propuesta_accesos is
  'Enlaces privados con código para compartir propuestas comerciales con desarrolladores.';
