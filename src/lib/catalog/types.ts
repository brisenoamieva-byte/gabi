import type { Cluster, Desarrollo, Prototipo } from "@/lib/data";

export type ComercializadoraRecord = {
  id: string;
  slug: string;
  nombre: string;
  logo: string | null;
  usuario: string;
  colorPrimary: string;
  colorAccent: string;
  portalPath: string;
};

export type DesarrolloRecord = Desarrollo & {
  comercializadoraId: string;
  recorridoEtapas: string[];
  recorridoVersion: number;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_RECORRIDO_ETAPAS = [
  "Confianza",
  "Necesidades",
  "Desarrollo",
  "Producto",
  "Cierre",
] as const;

export type ClusterRecord = Cluster & { desarrolloId: string };
export type PrototipoRecord = Prototipo & { desarrolloId: string };
