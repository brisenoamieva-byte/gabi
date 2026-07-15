import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";
import {
  MISION_LA_GAVIA_PLANO,
  type DisponibilidadPlanoConfigGavia,
} from "@/lib/disponibilidad/planos/mision-la-gavia";

export type DisponibilidadPlanoConfig = DisponibilidadPlanoConfigGavia;

const PLANOS_BY_DESARROLLO: Record<string, DisponibilidadPlanoConfig> = {
  [MISION_LA_GAVIA_DESARROLLO_ID]: MISION_LA_GAVIA_PLANO,
};

export function getDisponibilidadPlanoConfig(
  desarrolloId: string | null | undefined,
): DisponibilidadPlanoConfig | null {
  if (!desarrolloId) {
    return null;
  }
  return PLANOS_BY_DESARROLLO[desarrolloId] ?? null;
}

export function hasDisponibilidadPlano(desarrolloId: string | null | undefined): boolean {
  return Boolean(getDisponibilidadPlanoConfig(desarrolloId));
}
