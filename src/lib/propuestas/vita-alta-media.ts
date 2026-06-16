/** Material visual propuesta Vita Alta (Fracción 8 · La Machorra). */
const BASE = "/propuestas/vita-alta";

export const VITA_ALTA_MEDIA = {
  /** Lotificación oficial LOT-01 · ago 2025 (PDF hasta tener PNG exportado). */
  masterPlan: `${BASE}/lotificacion-fraccion-8.pdf`,
  /** Organigrama BBR — siempre el mismo archivo que propuesta NUBO. */
  organigrama: "/propuestas/nubo/organigrama.png",
} as const;

export type PropuestaComercialMedia = {
  masterPlan: string;
  organigrama: string;
};
