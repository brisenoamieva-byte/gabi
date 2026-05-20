import {
  bondades,
  grupoVinte,
  laVistaOverview,
  tecnicaDosMinutos,
  tecnicasCierre,
  zonaLaVista,
  type PuntoInteres,
  type TecnicaCierre,
} from "@/lib/data";

export type RecorridoZonaContent = {
  titulo: string;
  subtitulo: string;
  centro: string;
  direccion: string;
  mapaEmbedUrl: string;
  mapaUrl: string;
  mensajeAsesor: string;
  categoriasOrden: string[];
  puntosCercanos: PuntoInteres[];
};

export type RecorridoDesarrolladorContent = {
  titulo: string;
  subtitulo: string;
  historia: string;
  metricas: Array<{ valor: string; etiqueta: string }>;
  respaldo: string[];
  fraseAsesor: string;
  logoPath?: string;
};

export type RecorridoOverviewContent = {
  titulo: string;
  subtitulo: string;
  narrativa: string[];
  destacados: string[];
  logoPath?: string;
  guiaAsesor?: string;
};

export type RecorridoTecnicaDosMinutos = {
  titulo: string;
  tiempo: number;
  puntos: string[];
};

export type RecorridoContenido = {
  zona: RecorridoZonaContent;
  desarrollador: RecorridoDesarrolladorContent;
  overview: RecorridoOverviewContent;
  bondades: string[];
  tecnicasCierre: TecnicaCierre[];
  tecnicaDosMinutos: RecorridoTecnicaDosMinutos;
};

const laVistaDefaults = (): RecorridoContenido => ({
  zona: { ...zonaLaVista, puntosCercanos: [...zonaLaVista.puntosCercanos] },
  desarrollador: {
    ...grupoVinte,
    metricas: [...grupoVinte.metricas],
    respaldo: [...grupoVinte.respaldo],
    logoPath: "/logos/grupo-vinte.png",
  },
  overview: {
    ...laVistaOverview,
    narrativa: [...laVistaOverview.narrativa],
    destacados: [...laVistaOverview.destacados],
    logoPath: "/logos/la-vista-residencial-transparent.png",
    guiaAsesor:
      "Presenta La Vista como comunidad integral antes de entrar al cluster específico.",
  },
  bondades: [...bondades],
  tecnicasCierre: [...tecnicasCierre],
  tecnicaDosMinutos: { ...tecnicaDosMinutos, puntos: [...tecnicaDosMinutos.puntos] },
});

const emptyContenido = (): RecorridoContenido => ({
  zona: {
    titulo: "Ubicación",
    subtitulo: "",
    centro: "",
    direccion: "",
    mapaEmbedUrl: "",
    mapaUrl: "",
    mensajeAsesor: "",
    categoriasOrden: [],
    puntosCercanos: [],
  },
  desarrollador: {
    titulo: "Desarrollador",
    subtitulo: "",
    historia: "",
    metricas: [],
    respaldo: [],
    fraseAsesor: "",
  },
  overview: {
    titulo: "Desarrollo",
    subtitulo: "",
    narrativa: [],
    destacados: [],
  },
  bondades: [],
  tecnicasCierre: [...tecnicasCierre],
  tecnicaDosMinutos: { titulo: "Técnica de 2 minutos", tiempo: 120, puntos: [] },
});

export const getDefaultRecorridoContenido = (desarrolloId: string): RecorridoContenido => {
  if (desarrolloId === "la-vista-residencial") {
    return laVistaDefaults();
  }

  return emptyContenido();
};

export const mergeRecorridoContenido = (
  base: RecorridoContenido,
  patch: Partial<RecorridoContenido> | null | undefined,
): RecorridoContenido => {
  if (!patch || typeof patch !== "object") {
    return base;
  }

  return {
    zona: patch.zona ? { ...base.zona, ...patch.zona } : base.zona,
    desarrollador: patch.desarrollador
      ? { ...base.desarrollador, ...patch.desarrollador }
      : base.desarrollador,
    overview: patch.overview ? { ...base.overview, ...patch.overview } : base.overview,
    bondades: patch.bondades?.length ? patch.bondades : base.bondades,
    tecnicasCierre: patch.tecnicasCierre?.length ? patch.tecnicasCierre : base.tecnicasCierre,
    tecnicaDosMinutos: patch.tecnicaDosMinutos
      ? { ...base.tecnicaDosMinutos, ...patch.tecnicaDosMinutos }
      : base.tecnicaDosMinutos,
  };
};
