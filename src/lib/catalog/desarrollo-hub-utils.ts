import type { Cluster, Desarrollo } from "@/lib/data";
import type { DesarrolloRecord } from "@/lib/catalog/types";
import { getInvesttiDesarrolloPortada } from "@/lib/catalog/investti-recorrido-data";
import {
  DESARROLLO_HUB_HERO_IMAGES,
  desarrolloXperienceDisplayId,
  getDesarrolloXperienceProductId,
} from "@/lib/comercial/xperience-catalog-ids";

export const formatCatalogDate = (iso?: string | null) => {
  if (!iso) {
    return null;
  }
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getDesarrolloHeroImage = (
  desarrollo: Desarrollo,
  clusters: Cluster[],
): string | null => {
  if (desarrollo.hubHeroImage?.trim()) {
    return desarrollo.hubHeroImage.trim();
  }

  const investtiPortada = getInvesttiDesarrolloPortada(desarrollo.id);
  if (investtiPortada) {
    return investtiPortada;
  }

  const hubHero = DESARROLLO_HUB_HERO_IMAGES[desarrollo.id];
  if (hubHero) {
    return hubHero;
  }

  if (desarrollo.masterPlanImage) {
    return desarrollo.masterPlanImage;
  }

  const clusterPortada = clusters.find(
    (cluster) => (cluster.desarrolloId ?? "") === desarrollo.id && cluster.fotoPortada,
  );
  if (clusterPortada?.fotoPortada) {
    return clusterPortada.fotoPortada;
  }

  if (desarrollo.logo) {
    return desarrollo.logo;
  }

  return null;
};

export const desarrolloDisplayId = (desarrollo: Desarrollo) =>
  desarrolloXperienceDisplayId(desarrollo);

export const resolveComercializadorLabel = (
  desarrollo: DesarrolloRecord,
  comercializadoraNames: Record<string, string>,
) => {
  const byId = comercializadoraNames[desarrollo.comercializadoraId];
  if (byId) {
    return byId;
  }
  if (desarrollo.comercializador && !desarrollo.comercializador.includes("-")) {
    return desarrollo.comercializador;
  }
  return desarrollo.comercializadoraId;
};

export const filterDesarrollosHub = (
  desarrollos: DesarrolloRecord[],
  query: string,
  comercializadoraId?: string,
) => {
  const normalized = query.trim().toLowerCase();
  return desarrollos.filter((desarrollo) => {
    if (comercializadoraId && desarrollo.comercializadoraId !== comercializadoraId) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    const haystack = [
      desarrollo.nombre,
      desarrollo.slug,
      desarrollo.id,
      desarrollo.ubicacion,
      desarrollo.comercializador,
      desarrollo.desarrollador,
      String(getDesarrolloXperienceProductId(desarrollo.id) ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
};
