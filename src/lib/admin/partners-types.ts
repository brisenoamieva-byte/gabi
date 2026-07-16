export const PARTNER_TIPOS = ["inmobiliaria", "asesor_externo", "otro"] as const;
export type PartnerTipo = (typeof PARTNER_TIPOS)[number];

export const partnerTipoLabel: Record<PartnerTipo, string> = {
  inmobiliaria: "Inmobiliaria",
  asesor_externo: "Asesor externo",
  otro: "Otro aliado",
};

export type PartnerRecord = {
  id: string;
  comercializadora_id: string;
  tipo: PartnerTipo;
  nombre: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  activo: boolean;
  convenio_storage_path: string | null;
  convenio_public_url: string | null;
  convenio_nombre_archivo: string | null;
  convenio_subido_at: string | null;
  convenio_subido_por: string | null;
  created_at: string;
  updated_at: string;
};

export const isPartnerTipo = (value: string): value is PartnerTipo =>
  PARTNER_TIPOS.includes(value as PartnerTipo);
