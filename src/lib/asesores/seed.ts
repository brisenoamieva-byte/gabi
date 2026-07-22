/**
 * Antes este módulo reescribía `asesores.desarrollos_ids` desde data.ts
 * (seed Ricardo + union Investti en asesores BBR). Eso re-activaba desarrollos
 * que el admin había quitado a propósito.
 *
 * Las asignaciones se gestionan solo en Admin → Asesores / Usuarios.
 * `npm run sync` ya no toca desarrollos_ids.
 */

export type AsesoresSeedResult = {
  updated: number;
  skipped: number;
};

/** No-op conservado por compatibilidad con `scripts/run-catalog-seed.mjs`. */
export const syncAsesoresDesarrollosFromData = async (): Promise<AsesoresSeedResult> => ({
  updated: 0,
  skipped: 0,
});
