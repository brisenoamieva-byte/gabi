import { NUBO_ANALISIS_MEDIA } from "@/lib/propuestas/nubo-analisis-media";
import {
  NUBO_PREVENTA_ACCESOS,
  NUBO_PREVENTA_CONDICIONES,
  NUBO_PREVENTA_DIAGNOSTICO,
  NUBO_PREVENTA_HOTEL,
  NUBO_PREVENTA_META,
  NUBO_PREVENTA_PLANOS,
  NUBO_PREVENTA_RESTAURANTE,
} from "@/lib/estudios/nubo-preventa-content";
import type { NuboEstudioContenido, NuboEstudioMedia } from "@/lib/estudios/nubo-estudio-types";
import { DEFAULT_NUBO_UBICACION_MARCADORES, normalizeNuboUbicacionMarcadores } from "@/lib/estudios/nubo-ubicacion-markers";

export function getDefaultNuboEstudioContenido(): NuboEstudioContenido {
  return {
    meta: { ...NUBO_PREVENTA_META },
    diagnostico: { ...NUBO_PREVENTA_DIAGNOSTICO },
    condiciones: NUBO_PREVENTA_CONDICIONES.map((c) => ({ ...c })),
    planos: { ...NUBO_PREVENTA_PLANOS },
    accesos: {
      ...NUBO_PREVENTA_ACCESOS,
      paraArrancar: [...NUBO_PREVENTA_ACCESOS.paraArrancar],
    },
    hotel: {
      ...NUBO_PREVENTA_HOTEL,
      paraArrancar: [...NUBO_PREVENTA_HOTEL.paraArrancar],
    },
    restaurante: {
      ...NUBO_PREVENTA_RESTAURANTE,
      paraArrancar: [...NUBO_PREVENTA_RESTAURANTE.paraArrancar],
      referenciasConcepto: NUBO_PREVENTA_RESTAURANTE.referenciasConcepto.map((r) => ({ ...r })),
    },
  };
}

export function getDefaultNuboEstudioMedia(): NuboEstudioMedia {
  return {
    ubicacionSitio: NUBO_ANALISIS_MEDIA.ubicacionSitio,
    ubicacionMarcadores: { ...DEFAULT_NUBO_UBICACION_MARCADORES },
    hotelTaboadaActual: NUBO_ANALISIS_MEDIA.hotelTaboadaActual,
    accesosRef: NUBO_ANALISIS_MEDIA.accesosRef.map((r) => ({ ...r })),
    restauranteLookAndFeel: NUBO_ANALISIS_MEDIA.restauranteLookAndFeel.map((r) => ({
      ...r,
    })),
  };
}
