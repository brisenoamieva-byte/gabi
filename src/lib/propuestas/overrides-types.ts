import type { ConsultoriaMarcaPresentacion } from "@/lib/brand/consultoria-marca";
import type { PropuestaComercialData, PropuestaEstado } from "@/lib/propuestas/types";

/** Campos editables en admin sin tocar lotes / escenario financiero. */
export type PropuestaEditableOverrides = {
  estado?: PropuestaEstado;
  /** Logo y pie del entregable: BBR Habitarea o DMB Consultoría. */
  presentacionMarca?: ConsultoriaMarcaPresentacion;
  meta?: Partial<PropuestaComercialData["meta"]>;
  narrativa?: Partial<Omit<PropuestaComercialData["narrativa"], "estrategia">> & {
    estrategia?: string[];
  };
  propuestaBbr?: Partial<Omit<PropuestaComercialData["propuestaBbr"], "equipo">> & {
    equipo?: string[];
  };
};

export type PropuestaOverridesPublishMeta = {
  updatedAt: string;
  origin: "static" | "supabase";
  published: boolean;
};
