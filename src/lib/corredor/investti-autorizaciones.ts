import {
  getInvesttiReglas,
  getPlazoMaxPlanInvestti,
  INVESTTI_DESCUENTO_MAX_SIN_AUTORIZACION_PCT,
  type InvesttiTipoCompra,
} from "@/lib/corredor/investti-simulador";
import { formatPrice } from "@/lib/format/money";

export type InvesttiAutorizacionesEspeciales = {
  descuento: boolean;
  mensualidadBaja: boolean;
  plazoMayor: boolean;
  algunaRequerida: boolean;
  detalle: {
    descuento?: string;
    mensualidadBaja?: string;
    plazoMayor?: string;
  };
};

export const INVESTTI_AUTORIZACION_LABELS = {
  descuento: "Autorización Especial por descuento",
  mensualidadBaja: "Autorización Especial por mensualidad baja",
  plazoMayor: "Autorización Especial por plazo mayor",
} as const;

export function evaluarAutorizacionesInvestti(input: {
  desarrolloId: string;
  /** Fracción 0–1 (0.02 = 2%). */
  descuentoFraccion: number;
  plazoMeses: number;
  mensualidadDeseada?: number;
  aportacionCadaMeses?: number;
  aportacionDeseada?: number;
  /** Mensualidad del esquema estándar (pestaña esquemas). */
  mensualidadEsquema?: number;
  /** Solo aplica en propuesta personalizada (Excel I5). */
  tipoCompra?: InvesttiTipoCompra;
}): InvesttiAutorizacionesEspeciales {
  const reglas = getInvesttiReglas(input.desarrolloId);
  const detalle: InvesttiAutorizacionesEspeciales["detalle"] = {};

  const descuento =
    input.descuentoFraccion > INVESTTI_DESCUENTO_MAX_SIN_AUTORIZACION_PCT + 1e-9;
  if (descuento) {
    detalle.descuento = `Descuento ${(input.descuentoFraccion * 100).toFixed(2)}% (máx. sin autorización ${(INVESTTI_DESCUENTO_MAX_SIN_AUTORIZACION_PCT * 100).toFixed(1)}%).`;
  }

  const plazoMax = input.tipoCompra
    ? getPlazoMaxPlanInvestti(input.desarrolloId, input.tipoCompra)
    : (reglas?.plazoMaxMeses ?? 60);
  const plazoMayor = input.plazoMeses > plazoMax;
  if (plazoMayor) {
    detalle.plazoMayor = `Plazo ${input.plazoMeses} meses (máximo ${plazoMax} meses).`;
  }

  const mensMin =
    reglas && "mensualidadMinima" in reglas
      ? (reglas as { mensualidadMinima: number }).mensualidadMinima
      : 0;

  let mensualidadBaja = false;
  if (mensMin > 0) {
    const mensDeseada = input.mensualidadDeseada ?? 0;
    const cada = input.aportacionCadaMeses ?? 1;
    const montoReferencia =
      mensDeseada > 0
        ? mensDeseada
        : (input.aportacionDeseada ?? input.mensualidadEsquema ?? 0);

    if (mensDeseada > 0 && mensDeseada < mensMin) {
      mensualidadBaja = true;
      detalle.mensualidadBaja = `Mensualidad ${formatPrice(mensDeseada)} (mínima ${formatPrice(mensMin)}).`;
    } else if (cada === 1 && montoReferencia > 0 && montoReferencia < mensMin) {
      mensualidadBaja = true;
      detalle.mensualidadBaja = `Pago mensual ${formatPrice(montoReferencia)} (mínima ${formatPrice(mensMin)}).`;
    }
  }

  return {
    descuento,
    mensualidadBaja,
    plazoMayor,
    algunaRequerida: descuento || mensualidadBaja || plazoMayor,
    detalle,
  };
}
