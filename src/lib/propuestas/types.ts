export type PropuestaEstado = "borrador" | "enviada" | "firmada" | "archivada";

export type EsquemaPagoPropuesta = {
  nombre: string;
  descuento: number;
  enganche: number;
  mesesEnganche: number;
  mensualidades: number;
  finiquito: number;
  pctMensualidades: number;
  pctFiniquito: number;
};

export type TipoLoteResumen = {
  tipo: string;
  precioM2Lista: number;
  precioM2Contado: number;
  precioM26Msi: number;
  precioM212Msi: number;
  precioM218Msi: number;
  precioM224Msi: number;
  precioM23070: number;
};

export type LotePropuesta = {
  manzana: string;
  lote: string;
  superficieM2: number;
  tipo: string;
  precioM2: number | null;
  precioLista: number | null;
  precioContado: number | null;
  precio12Msi: number | null;
  enganche12: number | null;
  mensual12: number | null;
};

export type PropuestaComercialData = {
  id: string;
  slug: string;
  estado: PropuestaEstado;
  meta: {
    titulo: string;
    subtitulo: string;
    ubicacion: string;
    desarrollador: string;
    preparadoPara: string;
    elaboradoPor: string;
    fecha: string;
    clasificacion: string;
  };
  escenario: {
    totalLotes: number;
    absorcionMensual: number;
    mesesVenta: number;
    areaTotalM2: number;
    ingresoTotal: number;
    precioM2Promedio: number;
    ticketPromedio: number;
    lotePromedioM2: number;
    pctContado: number;
    precioBaseM2: number;
    listasPrecio: number;
    incrementoLista: number;
    mesesEntreListas: number;
    pctPublicidad: number;
    presupuestoPublicidad: number;
    publicidadMensual: number;
    terrenoMinM2: number;
    terrenoMaxM2: number;
  };
  esquemas: EsquemaPagoPropuesta[];
  tiposLote: TipoLoteResumen[];
  lotes: LotePropuesta[];
  tipoCounts: Record<string, number>;
  tasaDescuentoAnual: number;
  publicidad: {
    porcentaje: number;
    total: number;
    mensual: number;
    rubros: string[];
  };
  propuestaBbr: {
    exclusiva: boolean;
    comision: number;
    comisionVentaDirecta: number;
    iva: boolean;
    pagoComision: string;
    equipo: string[];
    mesesConstruccion: number;
  };
  narrativa: {
    quienesSomos: string;
    estrategia: string[];
    clasificacionLotes: string;
  };
};
