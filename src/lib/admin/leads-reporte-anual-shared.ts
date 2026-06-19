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
