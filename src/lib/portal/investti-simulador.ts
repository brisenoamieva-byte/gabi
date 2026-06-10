import {
  INVESTTI_CATALOG_DESARROLLO_IDS,
  INVESTTI_GRUPO_LOGO,
} from "@/lib/catalog/investti-desarrollos";
import type { AsesorSession } from "@/lib/asesores/types";
import type { PortalSession } from "@/lib/portal/session";

export const INVESTTI_SIMULADOR_PORTAL_SLUG = "investti";
export const INVESTTI_SIMULADOR_DEMO_ASESOR_ID = "investti-simulador-demo";

const DEV_DEFAULT_PIN = "8826";

export const resolveInvesttiSimuladorPin = (): string | null => {
  const fromEnv = process.env.INVESTTI_SIMULADOR_PIN?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_DEFAULT_PIN;
  }

  return null;
};

export const isInvesttiSimuladorPortal = (slug: string | null | undefined) =>
  slug?.toLowerCase() === INVESTTI_SIMULADOR_PORTAL_SLUG;

export const getInvesttiSimuladorPortalSession = (): PortalSession => ({
  id: INVESTTI_SIMULADOR_PORTAL_SLUG,
  nombre: "Grupo Investti",
  slug: INVESTTI_SIMULADOR_PORTAL_SLUG,
  logo: INVESTTI_GRUPO_LOGO,
  portalPath: "/investti",
  colorPrimary: "#13315C",
  colorAccent: "#C9A962",
});

export const getInvesttiSimuladorDesarrolloIds = (): string[] => [
  ...INVESTTI_CATALOG_DESARROLLO_IDS,
];

export const getInvesttiSimuladorDemoSession = (): AsesorSession => ({
  id: INVESTTI_SIMULADOR_DEMO_ASESOR_ID,
  nombre: "Gerente Investti",
  email: "simulador@grupoinvestti.com",
  rol: "gerente",
  desarrollosIds: getInvesttiSimuladorDesarrolloIds(),
});

export const matchesInvesttiSimuladorPin = (pin: string) => {
  const expected = resolveInvesttiSimuladorPin();
  return Boolean(expected && pin === expected);
};
