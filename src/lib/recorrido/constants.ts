import type { Cliente } from "@/lib/data";
import type { RecorridoState } from "@/lib/recorrido/types";
import { DEFAULT_RECORRIDO_ETAPAS } from "@/lib/catalog/types";

export const RECORRIDO_VERSION = 2;
export const LEGACY_ETAPA_COUNT = 4;

export const confianzaItems = [
  {
    title: "Saludar, sonreír, presentarse",
    detail: "Primer contacto cálido y profesional.",
  },
  {
    title: "Entregar tarjeta digital",
    detail: "Refuerza confianza y deja un canal claro de contacto.",
  },
  {
    title: "Ofrecer bebida",
    detail: "Agua, café o refresco para bajar tensión y abrir conversación.",
  },
  {
    title: "Frase de rompimiento de hielo",
    detail: "Conecta antes de preguntar; observa lenguaje corporal.",
  },
  {
    title: "Llenar formato de afluencia",
    detail: "Registra origen y datos clave sin interrumpir la plática.",
  },
] as const;

export const cierreItems = [
  "¿Qué producto y ubicación se queda?",
  "¿Apartado con tarjeta crédito o débito?",
  "¿Formalizamos ahora o dejar pasar promo?",
  "Solicitud de compra generada",
  "Felicitar y agradecer",
] as const;

export const medioContactoOptions: { value: Cliente["medioContacto"]; label: string }[] = [
  { value: "contacto-directo", label: "Contacto Directo" },
  { value: "referido", label: "Referido" },
  { value: "medios-digitales", label: "Medios Digitales" },
  { value: "pase", label: "Pase" },
  { value: "inmobiliaria-externo", label: "Inmobiliaria/externo" },
  { value: "espectacular", label: "Espectacular" },
  { value: "cross-selling", label: "Cross Selling" },
];

export const initialRecorridoState: RecorridoState = {
  etapa: 0,
  recorridoVersion: RECORRIDO_VERSION,
  leadId: undefined,
  cliente: {
    nombre: "",
    telefono: "",
    email: "",
    medioContacto: "contacto-directo",
    objetivo: "vivir",
    presupuesto: 3500000,
    familia: "1-2",
    mascotas: false,
    notas: "",
  },
  productoTipo: ["todos"],
  precioMinimo: 2500000,
  precioMaximo: 7000000,
  recamarasFiltro: ["cualquiera"],
  clusterId: "",
  prototipoId: "",
  unidadId: "",
  descuento: 0,
  esquema: "mensualidades",
};

export function migrateLegacyRecorridoEtapa(
  etapa: number,
  parsed: Partial<RecorridoState>,
  stageCount = DEFAULT_RECORRIDO_ETAPAS.length,
) {
  if (parsed.recorridoVersion === RECORRIDO_VERSION) {
    return Math.min(Math.max(etapa, 0), stageCount - 1);
  }

  if (etapa >= 2) {
    if (etapa === LEGACY_ETAPA_COUNT - 1) {
      return stageCount - 1;
    }

    if (parsed.clusterId || parsed.prototipoId) {
      return 3;
    }

    return 2;
  }

  return etapa;
}
