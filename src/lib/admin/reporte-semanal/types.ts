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
  precios: {
    m2PromedioReal: number | null;
    m2PromedioInventario: number | null;
    areaVendidaM2: number | null;
  };
  ingresos: {
    cajaSemana: number;
    comprometidos: number;
    ventasMesMonto: number;
  };
  ventasMes: ReporteSemanalOperacionLinea[];
  apartadosVigentes: ReporteSemanalOperacionLinea[];
  canceladosSemana: ReporteSemanalOperacionLinea[];
  matrizInventario: ReporteSemanalMatrizCelda[];
  absorcionPorModelo: ReporteSemanalAbsorcionModelo[];
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
  periodo: ReporteSemanalPeriodo;
  resumen: {
    afluencia: number;
    citasVisitas: number;
    apartadosOficinas: number;
    apartadosDeptos: number;
  };
  medios: ReporteSemanalMedio[];
  seguimiento: ReporteSemanalSeguimiento[];
  prospectosInteresados: ReporteSemanalProspectoInteresado[];
  segmentos: ReporteSemanalSegmento[];
  meta: {
    generadoAt: string;
    fuentes: string[];
  };
};
