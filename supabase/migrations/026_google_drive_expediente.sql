-- gabi · Enlaces Google Drive en expedientes (Pasaje Álamos y otros)
-- Ejecutar DESPUÉS de 023_expediente_comisiones.sql

alter table public.operaciones_comerciales
  add column if not exists drive_folder_id text;

alter table public.expediente_documentos
  add column if not exists drive_file_id text,
  add column if not exists drive_web_view_link text;

comment on column public.operaciones_comerciales.drive_folder_id is
  'Carpeta de Google Drive para el expediente de esta operación.';
comment on column public.expediente_documentos.drive_file_id is
  'ID del archivo en Google Drive (copia espejo del documento).';
comment on column public.expediente_documentos.drive_web_view_link is
  'URL para abrir el documento directamente en Google Drive.';
