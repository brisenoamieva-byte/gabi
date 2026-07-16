export type MisionLaGaviaEsquemaId =
  | "contado"
  | "6msi"
  | "12msi"
  | "30-70"
  | "15-85"
  | "libre";

export type MisionLaGaviaUnidadRecord = {
  unidad: string;
  edificio: string;
  lado: string;
  modelo: string;
  recamaras: number;
  m2Internos: number;
  m2Externos: number;
  m2Totales: number;
  precioLista: number;
  precioContado: number;
  precio303040: number | null;
  precio3070: number | null;
  precio1585: number | null;
  entregaIso: string | null;
  estatus: string;
};

export type MisionLaGaviaEsquemaConfig = {
  id: MisionLaGaviaEsquemaId;
  label: string;
  descuentoPct: number;
  enganchePct: number;
  meses: number | "varia";
  finiquitoPct: number;
};

/** Configuración editable del esquema Libre (asesor). */
export type MisionLaGaviaLibreConfig = {
  enganchePct: number;
  mensualidadesPct: number;
  fechaFiniquito?: Date;
};

export type MisionLaGaviaSimulacionInput = {
  unidad: MisionLaGaviaUnidadRecord;
  esquema: MisionLaGaviaEsquemaId;
  fechaCotizacion?: Date;
  libre?: MisionLaGaviaLibreConfig;
  /** Descuento especial gerente/director (fracción 0–0.015). */
  descuentoEspecialPct?: number;
};

export type MisionLaGaviaSimulacionResult = {
  esquema: MisionLaGaviaEsquemaId;
  esquemaLabel: string;
  unidad: string;
  modelo: string;
  edificio: string;
  lado: string;
  m2Totales: number;
  precioLista: number;
  precioTotal: number;
  /** Precio contado (base de capitalización Libre). */
  precioContado?: number;
  /** Descuento especial aplicado (fracción 0–0.015). */
  descuentoEspecialPct?: number;
  descuentoVsListaPct: number;
  enganche: number;
  enganchePct: number;
  mensualidad?: number;
  numMensualidades?: number;
  fechaPrimerPago?: Date;
  fechaUltimoPago?: Date;
  finiquito?: number;
  finiquitoPct?: number;
  fechaFiniquito?: Date;
  entregaLabel?: string;
  rentaMensual: number;
  rendimientoRentasAnual: number;
  descripcionPago: string;
  error?: string;
};
