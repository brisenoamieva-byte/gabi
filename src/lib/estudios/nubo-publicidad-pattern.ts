export type NuboPatronTipo = "mensual" | "intervalo" | "unico" | "manual";

export const NUBO_PATRON_TIPO_LABEL: Record<Exclude<NuboPatronTipo, "manual">, string> = {
  mensual: "Cada mes",
  intervalo: "Cada N meses",
  unico: "Pago único",
};

export function buildMesesFromPatron(input: {
  monto: number;
  tipo: Exclude<NuboPatronTipo, "manual">;
  intervaloMeses?: number;
  mesInicio?: number;
  totalMeses?: number;
}): string[] {
  const total = input.totalMeses ?? 30;
  const mesInicio = Math.max(0, Math.min(total - 1, input.mesInicio ?? 0));
  const meses = Array<string>(total).fill("");

  if (input.monto <= 0) {
    return meses;
  }

  const value = String(Math.round(input.monto));

  if (input.tipo === "unico") {
    meses[mesInicio] = value;
    return meses;
  }

  const step = input.tipo === "mensual" ? 1 : Math.max(1, Math.round(input.intervaloMeses ?? 2));

  for (let i = mesInicio; i < total; i += step) {
    meses[i] = value;
  }

  return meses;
}
