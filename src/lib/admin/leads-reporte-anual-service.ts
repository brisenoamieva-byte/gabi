import { listProspectos } from "@/lib/admin/prospectos-service";
import type { AdminProfile } from "@/lib/admin/types";
import { canAccessDesarrollo } from "@/lib/admin/permissions";

export type LeadsAnualFila = {
  id: string;
  label: string;
  meses: number[];
  total: number;
};

export type LeadsReporteAnual = {
  anio: number;
  porProducto: LeadsAnualFila[];
  porAsesor: LeadsAnualFila[];
  totalesPorMes: number[];
  granTotal: number;
};

const MES_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const MES_LABELS_ANUAL = MES_LABELS;

const emptyMeses = () => Array.from({ length: 12 }, () => 0);

const bumpMes = (meses: number[], isoDate: string) => {
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    meses[monthIndex] += 1;
  }
};

export const getLeadsReporteAnual = async (
  filters: { anio: number; desarrolloId?: string },
  profile?: AdminProfile,
  desarrolloLabels?: Record<string, string>,
): Promise<LeadsReporteAnual> => {
  const { anio, desarrolloId } = filters;

  if (profile && desarrolloId && !canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const desde = `${anio}-01-01`;
  const hasta = `${anio}-12-31`;

  const prospectos = await listProspectos(
    {
      desarrolloId,
      desde,
      hasta,
      spam: "include",
      duplicados: "include",
    },
    profile,
  );

  const productoMap = new Map<string, LeadsAnualFila>();
  const asesorMap = new Map<string, LeadsAnualFila>();
  const totalesPorMes = emptyMeses();

  for (const prospecto of prospectos) {
    bumpMes(totalesPorMes, prospecto.created_at);

    const productoKey = prospecto.desarrollo_id;
    const productoLabel =
      desarrolloLabels?.[productoKey] ??
      prospecto.producto_nombre ??
      productoKey;
    const productoRow = productoMap.get(productoKey) ?? {
      id: productoKey,
      label: productoLabel,
      meses: emptyMeses(),
      total: 0,
    };
    bumpMes(productoRow.meses, prospecto.created_at);
    productoRow.total += 1;
    productoMap.set(productoKey, productoRow);

    const asesorKey = prospecto.asesor_id ?? "__sin_asesor__";
    const asesorRow = asesorMap.get(asesorKey) ?? {
      id: asesorKey,
      label: prospecto.asesorNombre ?? "Sin asesor",
      meses: emptyMeses(),
      total: 0,
    };
    bumpMes(asesorRow.meses, prospecto.created_at);
    asesorRow.total += 1;
    asesorMap.set(asesorKey, asesorRow);
  }

  return {
    anio,
    porProducto: Array.from(productoMap.values()).sort((a, b) => b.total - a.total),
    porAsesor: Array.from(asesorMap.values()).sort((a, b) => b.total - a.total),
    totalesPorMes,
    granTotal: prospectos.length,
  };
};

export const exportLeadsAnualCsv = (reporte: LeadsReporteAnual) => {
  const header = ["Concepto", ...MES_LABELS, "Total"].join(",");

  const row = (label: string, meses: number[], total: number) =>
    [label, ...meses.map(String), String(total)].join(",");

  const blocks = [
    `# Reporte anual ${reporte.anio}`,
    "Por producto",
    header,
    ...reporte.porProducto.map((item) => row(item.label, item.meses, item.total)),
    row("Total", reporte.totalesPorMes, reporte.granTotal),
    "",
    "Por asesor",
    header,
    ...reporte.porAsesor.map((item) => row(item.label, item.meses, item.total)),
  ];

  return blocks.join("\n");
};
