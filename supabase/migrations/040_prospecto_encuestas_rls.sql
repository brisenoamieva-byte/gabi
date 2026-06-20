-- RLS en encuestas QA/satisfacción (acceso solo vía service role / API)

alter table public.prospecto_encuestas enable row level security;

drop policy if exists "prospecto_encuestas_service_all" on public.prospecto_encuestas;

create policy "prospecto_encuestas_service_all"
  on public.prospecto_encuestas for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
