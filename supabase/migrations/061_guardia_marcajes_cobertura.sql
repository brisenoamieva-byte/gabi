-- Marcajes por asesor (permite cubrir turnos de otros) + sin depender del unique por asignación

alter table public.guardia_marcajes
  drop constraint if exists guardia_marcajes_asignacion_id_tipo_key;

create unique index if not exists guardia_marcajes_asesor_fecha_turno_tipo_uidx
  on public.guardia_marcajes (asesor_id, fecha, turno, tipo);

comment on table public.guardia_marcajes is
  'Entrada y salida por asesor/turno (GPS). Un asesor puede cubrir el turno de otro.';

alter table public.guardia_salida_cuestionarios
  drop constraint if exists guardia_salida_cuestionarios_asignacion_id_key;

create unique index if not exists guardia_salida_cuestionarios_asesor_fecha_turno_uidx
  on public.guardia_salida_cuestionarios (asesor_id, fecha, turno);

comment on table public.guardia_salida_cuestionarios is
  'Cuestionario de salida de guardia por asesor/turno (incluye coberturas).';
