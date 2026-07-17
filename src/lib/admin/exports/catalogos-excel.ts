import type { CampanaRecord } from "@/lib/admin/campanas-service";
import type { PartnerRecord } from "@/lib/admin/partners-types";
import type { ExcelSheetSpec } from "@/lib/admin/excel-export";

export const campanasToExcelSheet = (rows: CampanaRecord[]): ExcelSheetSpec => ({
  name: "campanas",
  headers: [
    "id",
    "desarrollo_id",
    "nombre",
    "canal",
    "tipo",
    "parseur_email",
    "meta_lead_form_id",
    "activo",
    "created_at",
    "updated_at",
  ],
  rows: rows.map((row) => ({
    id: row.id,
    desarrollo_id: row.desarrollo_id,
    nombre: row.nombre,
    canal: row.canal,
    tipo: row.tipo,
    parseur_email: row.parseur_email,
    meta_lead_form_id: row.meta_lead_form_id,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })),
});

export const partnersToExcelSheet = (rows: PartnerRecord[]): ExcelSheetSpec => ({
  name: "partners",
  headers: [
    "id",
    "comercializadora_id",
    "tipo",
    "nombre",
    "contacto_nombre",
    "telefono",
    "email",
    "notas",
    "activo",
    "convenio_nombre_archivo",
    "convenio_subido_at",
    "created_at",
    "updated_at",
  ],
  rows: rows.map((row) => ({
    id: row.id,
    comercializadora_id: row.comercializadora_id,
    tipo: row.tipo,
    nombre: row.nombre,
    contacto_nombre: row.contacto_nombre,
    telefono: row.telefono,
    email: row.email,
    notas: row.notas,
    activo: row.activo,
    convenio_nombre_archivo: row.convenio_nombre_archivo,
    convenio_subido_at: row.convenio_subido_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })),
});
