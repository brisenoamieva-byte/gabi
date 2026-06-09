import { CDV_SEMBRADO_TEMPORAL } from "./cdv-sembrado-temporal.generated";

export { CDV_SEMBRADO_TEMPORAL };

export function getCdvTemporalEvidencia(): string[] {
  const t = CDV_SEMBRADO_TEMPORAL;
  const i = t.insights;
  return [
    `En los últimos 12 meses el metraje vendido subió de ${i.medianaM2PeriodoPrevio} m² a ${i.medianaM2Ultimos12Meses} m²; los lotes de 220 m² o más pasaron del ${i.pct220oMasHistorico}% al ${i.pct220oMasUltimos12}% de las ventas.`,
  ];
}

export function getCdvTemporalConclusiones(): readonly string[] {
  return CDV_SEMBRADO_TEMPORAL.conclusiones;
}
