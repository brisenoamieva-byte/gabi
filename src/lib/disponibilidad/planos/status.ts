import type { AsesorDisponibilidadRow } from "@/lib/inventario/asesor-disponibilidad";
import {
  decodeMisionLaGaviaUnidad,
  type GaviaEdificioId,
  type GaviaLado,
} from "@/lib/disponibilidad/planos/mision-la-gavia";

export type PlanoStatusBucket = "disponible" | "apartado" | "vendido" | "bloqueado" | "otro";

export function classifyDisponibilidadStatus(estatusSembrado: string): PlanoStatusBucket {
  if (estatusSembrado === "Disponibles") {
    return "disponible";
  }
  if (estatusSembrado.includes("Apartado")) {
    return "apartado";
  }
  if (estatusSembrado.includes("Vendid")) {
    return "vendido";
  }
  if (estatusSembrado.includes("Bloqueado") || estatusSembrado.includes("Asignado")) {
    return "bloqueado";
  }
  return "otro";
}

export type LadoStatusSummary = {
  disponibles: number;
  apartados: number;
  vendidos: number;
  bloqueados: number;
  otros: number;
  total: number;
  /** Color de relleno del bloque (lado). */
  tone: PlanoStatusBucket;
  tip: string;
};

export function summarizeLadoStatus(rows: AsesorDisponibilidadRow[]): LadoStatusSummary {
  const summary: LadoStatusSummary = {
    disponibles: 0,
    apartados: 0,
    vendidos: 0,
    bloqueados: 0,
    otros: 0,
    total: rows.length,
    tone: "otro",
    tip: "Sin unidades",
  };

  for (const row of rows) {
    const bucket = classifyDisponibilidadStatus(row.estatusSembrado);
    if (bucket === "disponible") summary.disponibles += 1;
    else if (bucket === "apartado") summary.apartados += 1;
    else if (bucket === "vendido") summary.vendidos += 1;
    else if (bucket === "bloqueado") summary.bloqueados += 1;
    else summary.otros += 1;
  }

  if (summary.disponibles > 0) {
    summary.tone = "disponible";
  } else if (summary.apartados > 0) {
    summary.tone = "apartado";
  } else if (summary.vendidos > 0) {
    summary.tone = "vendido";
  } else if (summary.bloqueados > 0) {
    summary.tone = "bloqueado";
  }

  const parts: string[] = [];
  if (summary.disponibles) parts.push(`${summary.disponibles} libre${summary.disponibles === 1 ? "" : "s"}`);
  if (summary.apartados) parts.push(`${summary.apartados} apartado${summary.apartados === 1 ? "" : "s"}`);
  if (summary.vendidos) parts.push(`${summary.vendidos} vendido${summary.vendidos === 1 ? "" : "s"}`);
  if (summary.bloqueados) parts.push(`${summary.bloqueados} bloqueado${summary.bloqueados === 1 ? "" : "s"}`);
  summary.tip = parts.length ? parts.join(" · ") : "Sin unidades";

  return summary;
}

export function indexUnidadesByEdificioLado(unidades: AsesorDisponibilidadRow[]) {
  const map = new Map<string, AsesorDisponibilidadRow[]>();

  for (const row of unidades) {
    const decoded = decodeMisionLaGaviaUnidad(row.unidad);
    if (!decoded) {
      continue;
    }
    const key = `${decoded.edificio}:${decoded.lado}`;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  for (const list of Array.from(map.values())) {
    list.sort((a, b) => {
      const da = decodeMisionLaGaviaUnidad(a.unidad);
      const db = decodeMisionLaGaviaUnidad(b.unidad);
      return (da?.nivel ?? 0) - (db?.nivel ?? 0);
    });
  }

  return map;
}

export function ladoKey(edificio: GaviaEdificioId, lado: GaviaLado): string {
  return `${edificio}:${lado}`;
}

export const PLANO_TONE_CLASS: Record<PlanoStatusBucket, string> = {
  disponible: "border-emerald-300/80 bg-emerald-50 text-emerald-900",
  apartado: "border-amber-300/80 bg-amber-50 text-amber-950",
  vendido: "border-slate-300 bg-slate-100 text-slate-600",
  bloqueado: "border-slate-200 bg-slate-50 text-slate-500",
  otro: "border-slate-200 bg-white text-slate-500",
};

export const PLANO_UNIT_TONE_CLASS: Record<PlanoStatusBucket, string> = {
  disponible: "border-emerald-200 bg-emerald-50/80",
  apartado: "border-amber-200 bg-amber-50/80",
  vendido: "border-slate-200 bg-slate-50",
  bloqueado: "border-slate-200 bg-slate-50/80",
  otro: "border-slate-200 bg-white",
};
