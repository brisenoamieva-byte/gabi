-- gabi · Limpiar asignaciones: asesores con Gavia quedan solo en Misión La Gavia
-- Corrige expansiones previas (seed/sync que unían Pasaje + Investti).
-- No toca asesores sin mision-la-gavia (p. ej. solo Investti).
-- Ejecutar DESPUÉS de 077_crm_playbook_gavia_modern.sql

update public.asesores
set
  desarrollos_ids = array['mision-la-gavia']::text[],
  updated_at = now()
where activo = true
  and 'mision-la-gavia' = any (desarrollos_ids)
  and desarrollos_ids <> array['mision-la-gavia']::text[];

-- Perfiles admin no-superadmin que operan Gavia: alinear alcance a solo Gavia
update public.admin_profiles
set
  desarrollos_ids = array['mision-la-gavia']::text[],
  updated_at = now()
where activo = true
  and rol not in ('superadmin', 'admin')
  and 'mision-la-gavia' = any (desarrollos_ids)
  and desarrollos_ids <> array['mision-la-gavia']::text[];
