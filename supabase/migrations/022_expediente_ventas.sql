-- gabi · Expediente de venta (documentos del cliente por operación)
-- Ejecutar DESPUÉS de 018_comercial_crm_sembrado.sql

create table if not exists public.expediente_documentos (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_comerciales (id) on delete cascade,
  desarrollo_id text not null,
  prospecto_id uuid references public.prospectos (id) on delete set null,
  tipo text not null check (
    tipo in (
      'identificacion',
      'comprobante_domicilio',
      'contrato',
      'solicitud_apartado',
      'comprobante_pago',
      'rfc',
      'escritura',
      'otro'
    )
  ),
  nombre text not null,
  nombre_archivo text not null,
  storage_path text not null,
  mime_type text not null,
  tamano_bytes bigint,
  activo boolean not null default true,
  subido_por uuid references public.admin_profiles (id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expediente_documentos_operacion_idx
  on public.expediente_documentos (operacion_id, activo, tipo);

create index if not exists expediente_documentos_desarrollo_idx
  on public.expediente_documentos (desarrollo_id, created_at desc);

create unique index if not exists expediente_documentos_operacion_tipo_activo_idx
  on public.expediente_documentos (operacion_id, tipo)
  where activo = true and tipo <> 'otro';

alter table public.expediente_documentos enable row level security;

create policy "expediente_documentos_admin_select"
  on public.expediente_documentos for select
  using (public.admin_can_access_desarrollo(desarrollo_id));

create policy "expediente_documentos_admin_write"
  on public.expediente_documentos for all
  using (public.admin_can_access_desarrollo(desarrollo_id));

-- Bucket privado (acceso vía URLs firmadas desde API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gabi-expedientes',
  'gabi-expedientes',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "gabi_expedientes_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'gabi-expedientes'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

create policy "gabi_expedientes_admin_select"
  on storage.objects for select
  using (
    bucket_id = 'gabi-expedientes'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

create policy "gabi_expedientes_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'gabi-expedientes'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

create policy "gabi_expedientes_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'gabi-expedientes'
    and exists (
      select 1 from public.admin_profiles
      where id = auth.uid() and activo = true
    )
  );

comment on table public.expediente_documentos is
  'Documentos del cliente vinculados a una operación comercial (expediente de venta).';
