import { formatPrice } from "@/lib/format/money";
import type { InvesttiAutorizacionesEspeciales } from "@/lib/corredor/investti-autorizaciones";
import type {
  InvesttiDiaPagoSubsecuente,
  InvesttiFilaProspecto,
  InvesttiTipoCompra,
} from "@/lib/corredor/investti-simulador";

const STORAGE_KEY = "investti-simulador-print-v1";

export type InvesttiSimuladorPrintEsquemaRow = {
  label: string;
  descuentoVsListaPct: number;
  total: number;
  enganchePct: number;
  engancheTotal: number;
  mensualidad: number;
  precioM2: number;
  selected: boolean;
};

export type InvesttiSimuladorPrintSnapshot = {
  savedAt: string;
  desarrolloId: string;
  desarrolloNombre: string;
  tab: "esquemas" | "propuesta";
  lote: {
    manzana: string;
    lote: string;
    superficie: number;
    tipo: string;
    entrega: string | null;
    precioLista: number;
  };
  precioContado: number;
  tipoEntrega: string;
  tipoCompra: InvesttiTipoCompra;
  tipoCompraLabel: string;
  calendario: {
    fechaPrimerPagoISO: string;
    diaPagosSubsecuentes: InvesttiDiaPagoSubsecuente;
    diaPagosLabel: string;
  };
  apartado: number;
  descuentoEspecialPct: number;
  resumenDescuento: {
    totalSinDescuento: number;
    totalConDescuento: number;
    requiereAutorizacion: boolean;
  };
  autorizaciones: InvesttiAutorizacionesEspeciales;
  reglasLine: string;
  esquemas?: InvesttiSimuladorPrintEsquemaRow[];
  esquemaAmort?: {
    label: string;
    descripcionPago: string;
  };
  propuesta?: {
    enganchePct: number;
    engancheDiferido: number;
    plazoMeses: number;
    aportacionCadaMeses: number;
    aportacionCadaLabel: string;
    mensualidadDeseada: number;
    engancheTotal: number;
    aportacionDeseada: number;
    montoMesAportacion: number;
    totalPagado: number;
    errores: string[];
  };
  filasProspecto: Array<{
    numero: number;
    fechaPagoISO: string;
    pagoTotal: number;
    apartado?: number;
    tipo: InvesttiFilaProspecto["tipo"];
  }>;
  calendarioTitulo: string;
  calendarioDescripcion: string;
};

/** Texto legal del PDF imprimible (como Excel «Para Imprimir»). */
export function getInvesttiTerminosCondiciones(apartado: number): {
  parrafos: string[];
  notaAportacionesAnuales: string;
} {
  const apartadoFmt = formatPrice(apartado);
  return {
    parrafos: [
      "Todos los precios tienen una vigencia de 5 días hábiles y están sujetos a cambio sin previo aviso.",
      `Apartado de ${apartadoFmt} pesos se tomará a cuenta de enganche.`,
      "Los valores anteriores son sólo referenciales e informativos, por lo que esta consulta no constituye preaprobación y por lo tanto no compromete al desarrollador.",
    ],
    notaAportacionesAnuales:
      "En caso de querer dar aportaciones adicionales anuales, se puede calcular el precio y tabla de amortización.",
  };
}

export function labelAportacionCadaMeses(meses: number): string {
  const labels: Record<number, string> = {
    1: "Mensual",
    3: "Trimestral",
    6: "Semestral",
    12: "Anual",
  };
  return labels[meses] ?? `Cada ${meses} meses`;
}

export function formatManzanaLabel(manzana: string): string {
  return manzana.replace(/^_/, "") || manzana;
}

export function saveInvesttiSimuladorPrintSnapshot(
  snapshot: InvesttiSimuladorPrintSnapshot,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const json = JSON.stringify(snapshot);
    // localStorage: compartido entre pestañas (sessionStorage no llega al window.open).
    localStorage.setItem(STORAGE_KEY, json);
    sessionStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function loadInvesttiSimuladorPrintSnapshot(): InvesttiSimuladorPrintSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InvesttiSimuladorPrintSnapshot;
  } catch {
    return null;
  }
}

export function filasProspectoToPrint(
  filas: InvesttiFilaProspecto[],
): InvesttiSimuladorPrintSnapshot["filasProspecto"] {
  return filas.map((fila) => ({
    numero: fila.numero,
    fechaPagoISO: fila.fechaPago.toISOString(),
    pagoTotal: fila.pagoTotal,
    apartado: fila.apartado,
    tipo: fila.tipo,
  }));
}
