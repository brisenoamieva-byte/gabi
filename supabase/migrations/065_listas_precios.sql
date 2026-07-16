-- gabi · Listas de precios versionadas por desarrollo
-- Incrementos %, vigencia, lista activa y atribución en operaciones.

create table if not exists public.listas_precios (
  id uuid primary key default gen_random_uuid(),
  desarrollo_id text not null,
  nombre text not null,
  codigo text not null,
  vigencia_desde date not null,
  vigencia_hasta date,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'activa', 'cerrada')),
  incremento_pct numeric,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (desarrollo_id, codigo)
);

create unique index if not exists listas_precios_una_activa_idx
  on public.listas_precios (desarrollo_id)
  where estado = 'activa';

create index if not exists listas_precios_desarrollo_estado_idx
  on public.listas_precios (desarrollo_id, estado, vigencia_desde desc);

create table if not exists public.lista_precios_unidades (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas_precios (id) on delete cascade,
  unidad_id uuid not null references public.disponibilidad_unidades (id) on delete cascade,
  precio_lista numeric not null check (precio_lista >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lista_id, unidad_id)
);

create index if not exists lista_precios_unidades_unidad_idx
  on public.lista_precios_unidades (unidad_id);

alter table public.operaciones_comerciales
  add column if not exists lista_precios_id uuid references public.listas_precios (id) on delete set null;

create index if not exists operaciones_lista_precios_idx
  on public.operaciones_comerciales (lista_precios_id);

alter table public.listas_precios enable row level security;
alter table public.lista_precios_unidades enable row level security;

create policy "listas_precios_admin_select"
  on public.listas_precios for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "listas_precios_admin_write"
  on public.listas_precios for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "lista_precios_unidades_admin_select"
  on public.lista_precios_unidades for select
  using (
    exists (
      select 1
      from public.listas_precios l
      where l.id = lista_precios_unidades.lista_id
        and public.admin_can_access_desarrollo(l.desarrollo_id)
    )
  );

create policy "lista_precios_unidades_admin_write"
  on public.lista_precios_unidades for all
  using (
    exists (
      select 1
      from public.listas_precios l
      where l.id = lista_precios_unidades.lista_id
        and public.admin_can_access_desarrollo(l.desarrollo_id)
    )
  );

comment on table public.listas_precios is
  'Versiones de lista de precios por desarrollo (borrador / activa / cerrada).';

comment on table public.lista_precios_unidades is
  'Precio lista por unidad dentro de una versión de lista.';

comment on column public.operaciones_comerciales.lista_precios_id is
  'Lista de precios con la que se apartó/vendió (congelada).';
