export type ReporteSemanalPeriodo = {
  desde: string;
  hasta: string;
  label: string;
};

export type ReporteSemanalMedio = {
  medio: string;
  semana: number;
  mes: number;
  acumulado: number;
  pctSemana: number;
};

export type ReporteSemanalSeguimiento = {
  estatus: string;
  semana: number;
  mes: number;
  pctMes: number;
};

export type ReporteSemanalOperacionLinea = {
  cliente: string;
  unidad: string;
  precioM2: number | null;
  precioLista: number | null;
  precioVenta: number | null;
  lista: string | null;
  plazo: string | null;
  asesor: string | null;
  fecha: string | null;
  medio: string | null;
  estatus: string;
};

export type ReporteSemanalMatrizCelda = {
  lista: string;
  modelo: string;
  disponibles: number;
};

export type ReporteSemanalAbsorcionModelo = {
  modelo: string;
  apartados: number;
  ventas: number;
  asignados: number;
  afluencia: number;
};

export type ReporteSemanalAvanceVentas = {
  ventas: number;
  ventasObjetivo: number;
  ventasDiferencia: number;
  apartadosVentasVigentes: number;
  apartadosObjetivo: number;
  apartadosDiferencia: number;
  cancelaciones: number;
  asignados: number;
  reales: number;
  absorcionPct: number | null;
};

export type ReporteSemanalIngresosColumnas = {
  anterior: number;
  mesActual: number;
  acumulado: number;
  mesSiguienteObjetivo: number;
  diferenciaAcumulado: number;
};

export type ReporteSemanalObjetivoIngresos = {
  totalObjetivo: number;
  cajaReal: number;
  comprometidos: number;
  pctCaja: number;
  pctComprometidos: number;
  pctTotal: number;
};

export type ReporteSemanalSegmento = {
  id: string;
  label: string;
  kpis: {
    ventasSemana: number;
    apartadosSemana: number;
    cancelacionesSemana: number;
    asignadosActuales: number;
    apartadosVigentes: number;
    ventasMes: number;
    apartadosMes: number;
    absorcionPct: number | null;
  };
  avance: ReporteSemanalAvanceVentas;
  precios: {
    m2PromedioReal: number | null;
    m2PromedioObjetivo: number | null;
    m2PromedioInventario: number | null;
    areaVendidaM2: number | null;
  };
  ingresos: {
    cajaSemana: number;
    comprometidos: number;
    ventasMesMonto: number;
  };
  ingresosColumnas: ReporteSemanalIngresosColumnas;
  objetivoIngresos: ReporteSemanalObjetivoIngresos | null;
  ventasMes: ReporteSemanalOperacionLinea[];
  apartadosVigentes: ReporteSemanalOperacionLinea[];
  canceladosSemana: ReporteSemanalOperacionLinea[];
  matrizInventario: ReporteSemanalMatrizCelda[];
  absorcionPorModelo: ReporteSemanalAbsorcionModelo[];
};

export type ReporteSemanalFunnelMedio = {
  medio: string;
  afluencia: number;
  citas: number;
  apartados: number;
  ventas: number;
  asignaciones: number;
};

export type ReporteSemanalFunnelSegmento = {
  segmentoId: string;
  label: string;
  etapas: {
    afluencia: number;
    citas: number;
    apartadosVigentes: number;
    ventas: number;
    asignaciones: number;
  };
  porMedio: ReporteSemanalFunnelMedio[];
};

export type ReporteSemanalAbsorcionMes = {
  mes: string;
  mesKey: string;
  apartadosDeptos: number;
  apartadosOficinas: number;
  afluencia: number;
  citasVisitas: number;
};

export type ReporteSemanalVisitaInmobiliaria = {
  inmobiliaria: string;
  fecha: string;
  prospecto: string | null;
};

export type ReporteSemanalProspectoInteresado = {
  nombre: string;
  unidad: string | null;
  tipo: string | null;
  asesor: string | null;
  plazo: string | null;
  observaciones: string | null;
};

export type ReporteComercialSemanal = {
  desarrolloId: string;
  desarrolloNombre?: string;
  periodo: ReporteSemanalPeriodo;
  resumen: {
    afluencia: number;
    citasVisitas: number;
    apartadosOficinas: number;
    apartadosDeptos: number;
    apartadosTotal: number;
  };
  funnels: ReporteSemanalFunnelSegmento[];
  absorcionMensual: ReporteSemanalAbsorcionMes[];
  medios: ReporteSemanalMedio[];
  seguimiento: ReporteSemanalSeguimiento[];
  visitasInmobiliarias: ReporteSemanalVisitaInmobiliaria[];
  prospectosInteresados: ReporteSemanalProspectoInteresado[];
  segmentos: ReporteSemanalSegmento[];
  meta: {
    generadoAt: string;
    fuentes: string[];
    objetivosOrigen: "config" | "none";
  };
};

/** Orden canónico del PDF para estatus de seguimiento. */
export const SEGUIMIENTO_ESTATUS_ORDEN = [
  "Canceló",
  "Posib. compra inmediata",
  "Apartó / Compró / Asignaciones",
  "Llamar más adelante",
  "En seguimiento",
  "No comprará",
] as const;
