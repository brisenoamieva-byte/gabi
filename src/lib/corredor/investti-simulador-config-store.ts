import { INVESTTI_SIMULADOR_CONFIG } from "@/lib/corredor/investti-simulador-config.generated";
import type { InvesttiSimuladorConfigData } from "@/lib/corredor/investti-simulador-data-types";

function fromGenerated(): InvesttiSimuladorConfigData {
  const c = INVESTTI_SIMULADOR_CONFIG;
  return {
    generatedAt: c.generatedAt,
    source: c.source,
    interestAnual: c.interestAnual,
    apartadoDefault: c.apartadoDefault,
    descuentosEsquemaPct: { ...c.descuentosEsquemaPct },
    esquemas: c.esquemas.map((e) => ({ ...e })),
    desarrolloSlug: { ...c.desarrolloSlug },
    slugDesarrollo: { ...c.slugDesarrollo },
    stats: c.stats
      ? {
          lotes: c.stats.lotes,
          byDev: { ...c.stats.byDev },
          precioDesdeLista: c.stats.precioDesdeLista
            ? { ...c.stats.precioDesdeLista }
            : undefined,
          precioContadoDesde: c.stats.precioContadoDesde
            ? { ...c.stats.precioContadoDesde }
            : undefined,
        }
      : undefined,
    reglas: Object.fromEntries(
      Object.entries(c.reglas).map(([k, v]) => [k, { ...v }]),
    ),
  };
}

let runtimeConfig: InvesttiSimuladorConfigData = fromGenerated();

export function getInvesttiSimuladorConfigData(): InvesttiSimuladorConfigData {
  return runtimeConfig;
}

export function setInvesttiSimuladorConfigData(config: InvesttiSimuladorConfigData): void {
  runtimeConfig = config;
}

export function resetInvesttiSimuladorConfigData(): void {
  runtimeConfig = fromGenerated();
}
