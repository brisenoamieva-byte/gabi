import type { DisponibilidadPlano, DisponibilidadUnidad } from "@/lib/data";

export type AvailabilityView = "recomendadas";

export type AvailabilityLayoutMode =
  | "departamentos"
  | "mixto"
  | "lotes-casas"
  | "referencial";

export type AvailabilityConfig = {
  views: AvailabilityView[];
  primaryView: AvailabilityView;
  layoutMode: AvailabilityLayoutMode;
  advisorHint: string;
  suggestedTypeFilter: "todos" | DisponibilidadUnidad["tipo"];
};

export const availabilityViewLabel: Record<AvailabilityView, string> = {
  recomendadas: "Unidades disponibles",
};

export const availabilityViewDescription: Record<AvailabilityView, string> = {
  recomendadas:
    "Todas las unidades disponibles según inventario comercial (sembrado cuando hay conexión).",
};

const countByTipo = (units: DisponibilidadUnidad[]) => ({
  departamento: units.filter((unit) => unit.tipo === "departamento").length,
  casa: units.filter((unit) => unit.tipo === "casa").length,
  terreno: units.filter((unit) => unit.tipo === "terreno").length,
  oficina: units.filter((unit) => unit.tipo === "oficina").length,
});

const inferLayoutMode = (
  units: DisponibilidadUnidad[],
  plano?: DisponibilidadPlano,
): AvailabilityLayoutMode => {
  if (plano?.modoVisualizacion && plano.modoVisualizacion !== "auto") {
    return plano.modoVisualizacion;
  }

  if (!units.length) {
    return "referencial";
  }

  const counts = countByTipo(units);
  const activeTypes = Object.values(counts).filter((count) => count > 0).length;

  if (counts.departamento === units.length || counts.oficina === units.length) {
    return "departamentos";
  }

  if (activeTypes > 1) {
    return "mixto";
  }

  if (counts.terreno > 0) {
    return "lotes-casas";
  }

  return "lotes-casas";
};

const buildAdvisorHint = (
  units: DisponibilidadUnidad[],
  fromSembrado: boolean,
) => {
  if (!units.length) {
    return "No hay unidades disponibles en este cluster. Descarga el inventario PDF para consultar el corte oficial.";
  }

  const disponibles = units.filter((unit) => unit.estatus === "disponible").length;

  if (fromSembrado) {
    return `${disponibles} unidad${disponibles === 1 ? "" : "es"} disponible${disponibles === 1 ? "" : "s"} según sembrado. Ordenadas por afinidad con el perfil del cliente.`;
  }

  return `${disponibles} unidad${disponibles === 1 ? "" : "es"} disponible${disponibles === 1 ? "" : "s"} para esta visita. Descarga el PDF para el inventario oficial completo.`;
};

const inferSuggestedTypeFilter = (
  units: DisponibilidadUnidad[],
  preferredTypes: Array<DisponibilidadUnidad["tipo"]>,
): AvailabilityConfig["suggestedTypeFilter"] => {
  if (preferredTypes.length !== 1) {
    return "todos";
  }

  const preferred = preferredTypes[0];
  const hasPreferred = units.some((unit) => unit.tipo === preferred);

  return hasPreferred ? preferred : "todos";
};

export const resolveAvailabilityConfig = (
  units: DisponibilidadUnidad[],
  plano?: DisponibilidadPlano,
  preferredProductTypes: Array<DisponibilidadUnidad["tipo"]> = [],
  fromSembrado = false,
): AvailabilityConfig => {
  const layoutMode = inferLayoutMode(units, plano);

  return {
    views: ["recomendadas"],
    primaryView: "recomendadas",
    layoutMode,
    advisorHint: buildAdvisorHint(units, fromSembrado),
    suggestedTypeFilter: inferSuggestedTypeFilter(units, preferredProductTypes),
  };
};

export const mapProductoFiltroToAvailabilityTipo = (
  productTypes: Array<"casa" | "departamento" | "terreno" | "oficina" | "todos">,
): Array<DisponibilidadUnidad["tipo"]> => {
  if (productTypes.includes("todos") || productTypes.length !== 1) {
    return [];
  }

  return productTypes.filter(
    (type): type is DisponibilidadUnidad["tipo"] => type !== "todos",
  );
};
