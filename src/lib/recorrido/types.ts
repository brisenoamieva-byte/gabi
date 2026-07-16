import type { Cliente } from "@/lib/data";
import type { DisponibilidadUnidad, Prototipo } from "@/lib/data";

export type ProductoFiltro = "casa" | "departamento" | "terreno" | "oficina";
export type ProductoSeleccion = "todos" | ProductoFiltro;
export type RecamarasFiltro = "2" | "3" | "4+";
export type RecamarasSeleccion = "cualquiera" | RecamarasFiltro;

export type ClienteTemporal = {
  nombre: string;
  telefono: string;
  email: string;
  medioContacto: Cliente["medioContacto"];
  objetivo: "vivir" | "invertir";
  presupuesto: number;
  familia: "1-2" | "3-4" | "5+";
  mascotas: boolean;
  notas: string;
};

export type RecorridoState = {
  etapa: number;
  recorridoVersion?: number;
  leadId?: string;
  cliente: ClienteTemporal;
  productoTipo: ProductoSeleccion[];
  precioMinimo: number;
  precioMaximo: number;
  recamarasFiltro: RecamarasSeleccion[];
  clusterId: string;
  prototipoId: string;
  unidadId: string;
  descuento: number;
  esquema: "mensualidades" | "contado";
  pasajeEsquema?: import("@/lib/cotizador/pasaje-simulador").PasajeEsquemaPago;
  pasajeLibreEnganche?: number;
  pasajeLibreMensualidades?: number;
  pasajeLibreFechaFiniquito?: string;
  pasajeLibreSinMensEnganche?: number;
  pasajeLibreSinMensPago?: number;
  pasajeLibreSinMensFechaPago?: string;
  pasajeLibreSinMensFechaFiniquito?: string;
  misionLaGaviaEsquema?: import("@/lib/corredor/mision-la-gavia-simulador").MisionLaGaviaEsquemaId;
  misionLaGaviaLibreEnganche?: number;
  misionLaGaviaLibreMensualidades?: number;
  misionLaGaviaLibreFechaFiniquito?: string;
};

export type StoredContact = {
  id?: string;
  email?: string;
  telefono?: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  cliente?: Partial<ClienteTemporal>;
};

export type RecommendedAvailability = {
  unit: DisponibilidadUnidad;
  prototipo?: Prototipo;
  score: number;
  reasons: string[];
};
