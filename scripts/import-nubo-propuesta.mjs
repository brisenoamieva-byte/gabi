/**
 * Importa NUBO ETAPA 1.xlsx → src/lib/propuestas/nubo.generated.ts
 * Uso: node scripts/import-nubo-propuesta.mjs [ruta-al-xlsx]
 */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = process.cwd();
const DEFAULT_XLSX =
  "c:/Users/brise/OneDrive/Obsoletos/archivos/Escritorio9nov19/Escritorio2/Escritorio/NUBO ETAPA 1.xlsx";
const OUT = path.join(ROOT, "src/lib/propuestas/nubo.generated.ts");

const xlsxPath = process.argv[2] ?? DEFAULT_XLSX;
if (!fs.existsSync(xlsxPath)) {
  console.error("No se encontró el Excel:", xlsxPath);
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath, { cellDates: true });

const num = (v) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const pct = (v) => {
  const n = num(v);
  return n == null ? null : n;
};

// --- Proyección (KPIs) ---
const proj = XLSX.utils.sheet_to_json(wb.Sheets["Proyección"], { header: 1, defval: "" });
const kpiRow = proj[3] ?? [];
const escenario = {
  totalLotes: num(kpiRow[5]) ?? 100,
  absorcionMensual: num(kpiRow[1]) ?? 4,
  mesesVenta: num(kpiRow[6]) ?? 25,
  areaTotalM2: num(kpiRow[7]) ?? 0,
  ingresoTotal: num(kpiRow[8]) ?? 0,
  precioM2Promedio: num(kpiRow[9]) ?? 0,
  ticketPromedio: num(kpiRow[10]) ?? 0,
  lotePromedioM2: num(kpiRow[11]) ?? 0,
  pctContado: num(kpiRow[13]) ?? 0.16,
  precioBaseM2: num(proj[5]?.[1]) ?? 5600,
  listasPrecio: num(proj[7]?.[1]) ?? 8,
  incrementoLista: num(proj[8]?.[1]) ?? 0.02,
  mesesEntreListas: num(proj[9]?.[1]) ?? 3,
  pctPublicidad: num(proj[9]?.[8]) ?? 0.025,
  presupuestoPublicidad: num(proj[10]?.[8]) ?? 0,
  publicidadMensual: num(proj[11]?.[8]) ?? 0,
  terrenoMinM2: num(proj[11]?.[12]) ?? 392,
  terrenoMaxM2: num(proj[11]?.[13]) ?? 1037.9,
};

// --- Esquemas (Fórmulas + Descuentos) ---
const form = XLSX.utils.sheet_to_json(wb.Sheets["Fórmulas"], { header: 1, defval: "" });
const esquemas = [];
for (let i = 4; i < 10; i++) {
  const row = form[i];
  const nombre = String(row[1] ?? "").trim();
  if (!nombre) continue;
  esquemas.push({
    nombre,
    descuento: pct(row[2]) ?? 0,
    enganche: pct(row[3]) ?? 0,
    mesesEnganche: num(row[4]) ?? 1,
    mensualidades: num(row[5]) ?? 0,
    finiquito: pct(row[6]) ?? 0,
    pctMensualidades: pct(row[7]) ?? 0,
    pctFiniquito: pct(row[8]) ?? 0,
  });
}

// --- Resumen precios por tipo ---
const resumen = XLSX.utils.sheet_to_json(wb.Sheets["Resumen precios"], { header: 1, defval: "" });
const tiposLote = [];
for (let i = 3; i < resumen.length; i++) {
  const row = resumen[i];
  const tipo = String(row[0] ?? "").trim();
  if (!tipo || tipo === "Tipo de lote") continue;
  tiposLote.push({
    tipo,
    precioM2Lista: num(row[1]) ?? 0,
    precioM2Contado: num(row[2]) ?? 0,
    precioM26Msi: num(row[3]) ?? 0,
    precioM212Msi: num(row[4]) ?? 0,
    precioM218Msi: num(row[5]) ?? 0,
    precioM224Msi: num(row[6]) ?? 0,
    precioM23070: num(row[7]) ?? 0,
  });
}

// --- Lista de precios (muestra + stats) ---
const lista = XLSX.utils.sheet_to_json(wb.Sheets["Lista de Precios"], { header: 1, defval: "" });
const lotes = [];
const tipoCounts = {};
for (let i = 5; i < lista.length; i++) {
  const row = lista[i];
  const manzana = String(row[0] ?? "").trim();
  const lote = String(row[1] ?? "").trim();
  if (!manzana || !lote) continue;
  const superficie = num(row[2]);
  const tipo = String(row[3] ?? "").trim();
  const precioM2 = num(row[4]);
  const precioLista = num(row[5]);
  const precioContado = num(row[7]);
  if (!superficie || !precioLista) continue;
  tipoCounts[tipo] = (tipoCounts[tipo] ?? 0) + 1;
  lotes.push({
    manzana,
    lote,
    superficieM2: superficie,
    tipo,
    precioM2,
    precioLista,
    precioContado,
    precio12Msi: num(row[9]),
    enganche12: num(row[10]),
    mensual12: num(row[11]),
  });
}

const tasaAnual = num(
  XLSX.utils.sheet_to_json(wb.Sheets["Descuentos"], { header: 1, defval: "" })[0]?.[1],
) ?? 0.11;

const output = `/* eslint-disable */
/** Generado por scripts/import-nubo-propuesta.mjs — no editar a mano */
import type { PropuestaComercialData } from "@/lib/propuestas/types";

export const NUBO_PROPUESTA_GENERATED: PropuestaComercialData = ${JSON.stringify(
  {
    id: "nubo-etapa-1",
    slug: "nubo",
    estado: "borrador",
    meta: {
      titulo: "NUBO",
      subtitulo: "Propuesta de comercialización",
      ubicacion: "San Miguel de Allende, Guanajuato",
      desarrollador: "NUBO",
      preparadoPara: "Desarrollador NUBO",
      elaboradoPor: "BBR Habitarea",
      fecha: "mayo 2026",
      clasificacion: "Propuesta comercial · Confidencial",
    },
    escenario,
    esquemas,
    tiposLote,
    lotes,
    tipoCounts,
    tasaDescuentoAnual: tasaAnual,
    publicidad: {
      porcentaje: escenario.pctPublicidad,
      total: escenario.presupuestoPublicidad,
      mensual: escenario.publicidadMensual,
      rubros: [
        "Identificar diferenciadores (ubicación, hotel, amenidades)",
        "Diseño de página web",
        "Construcción de acceso y showroom de ventas",
        "Acondicionamiento Hotel Taboada — experiencia de marca",
        "Amenidades prioritarias",
        "Materiales impresos y digitales",
        "CRM, atención inmediata, conmutador virtual",
        "Señalética y eventos con inmobiliarias e inversionistas",
      ],
    },
    propuestaBbr: {
      exclusiva: true,
      comision: 0.06,
      comisionVentaDirecta: 0.025,
      iva: true,
      pagoComision:
        "100% a la firma de oferta de compra o contrato y pago de enganche de los lotes",
      equipo: [
        "Director Operativo",
        "Director Comercial",
        "Gerente Comercial",
        "Asesores",
        "Titulación",
        "Administración",
      ],
      mesesConstruccion: 20,
    },
    narrativa: {
      quienesSomos: `BBR Habitarea es una empresa dedicada a la comercialización de desarrollos inmobiliarios en exclusiva, con más de 50 años de experiencia combinada del equipo. Servicios: planeación de proyectos, estrategias de comercialización, conformación y capacitación de equipo comercial, atención post-venta, tramitología y titulación (Infonavit, Fovissste, bancos), estudios de mercado y análisis de competencia.`,
      estrategia: [
        "Objetivo: venta de 100 lotes habitacionales en 25 meses (4 lotes/mes).",
        "Incremento de precio del 2% cada 3 meses o al agotar 12 lotes por lista.",
        "Mix de esquemas: contado, 12/18/24 MSI y 30-70 con descuentos equivalentes a tasa del 11% anual.",
        "Plusvalía conservadora del 8% anual en el horizonte del escenario.",
        "Clasificación de lotes A/B/C/D por tamaño, esquina y área verde.",
      ],
      clasificacionLotes:
        "Los lotes se clasificaron según tamaño, esquina y proximidad a área verde (dos categorías), generando cuatro tipos con precio por m² diferenciado.",
    },
  },
  null,
  2,
)};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, output, "utf8");

console.log("Escrito:", OUT);
console.log("Lotes:", lotes.length, "Tipos:", tipoCounts);
console.log("Ingreso:", escenario.ingresoTotal, "Publicidad:", escenario.presupuestoPublicidad);
