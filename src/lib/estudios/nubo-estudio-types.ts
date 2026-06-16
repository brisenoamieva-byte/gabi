import type { NuboUbicacionMarcadores } from "@/lib/estudios/nubo-ubicacion-markers";

/** Contenido editable del estudio NUBO · preventa. */
export type NuboEstudioMeta = {
  titulo: string;
  subtitulo: string;
  ubicacion: string;
  cliente: string;
  elaboradoPor: string;
  fecha: string;
  clasificacion: string;
};

export type NuboEstudioDiagnostico = {
  titulo: string;
  contexto: string;
  escenario: string;
  cierre: string;
};

export type NuboEstudioCondicion = {
  num: string;
  titulo: string;
  detalle: string;
};

export type NuboEstudioReferenciaConcepto = {
  nombre: string;
  detalle: string;
};

export type NuboEstudioContenido = {
  meta: NuboEstudioMeta;
  diagnostico: NuboEstudioDiagnostico;
  condiciones: NuboEstudioCondicion[];
  planos: { ubicacionSitio: string };
  accesos: {
    num: string;
    titulo: string;
    hoy: string;
    recomendacion: string;
    paraArrancar: string[];
    ubicacionEnPlano: string;
  };
  hotel: {
    num: string;
    titulo: string;
    nombre: string;
    hoy: string;
    recomendacion: string;
    paraArrancar: string[];
    fotoActualCaption: string;
    ubicacionEnPlano: string;
  };
  restaurante: {
    num: string;
    titulo: string;
    hoy: string;
    recomendacion: string;
    paraArrancar: string[];
    ubicacionEnPlano: string;
    lookAndFeel: string;
    referenciasConcepto: NuboEstudioReferenciaConcepto[];
  };
};

export type NuboEstudioMediaRef = {
  src: string;
  nombre: string;
  detalle: string;
};

export type NuboEstudioMedia = {
  ubicacionSitio: string;
  /** Posición % de iconos sobre el mapa (editable en panel Imágenes). */
  ubicacionMarcadores?: NuboUbicacionMarcadores;
  hotelTaboadaActual: string;
  accesosRef: NuboEstudioMediaRef[];
  restauranteLookAndFeel: NuboEstudioMediaRef[];
};

export type NuboEstudioPublishMeta = {
  updatedAt: string;
  origin: "supabase" | "static";
  /** true cuando hay JSON publicado en la columna contenido (no el archivo base). */
  contenidoPublicado?: boolean;
  /** true cuando hay JSON publicado en la columna media. */
  mediaPublicado?: boolean;
};
