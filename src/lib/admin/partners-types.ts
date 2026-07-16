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
  created_at: string;
  updated_at: string;
};

export const isPartnerTipo = (value: string): value is PartnerTipo =>
  PARTNER_TIPOS.includes(value as PartnerTipo);
