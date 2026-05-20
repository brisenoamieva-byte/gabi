import type { VisitaInput } from "@/lib/visitas/types";

export const trackVisita = (input: VisitaInput) => {
  void fetch("/api/visitas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    // Fire-and-forget: la visita local no debe bloquearse si falla el servidor.
  });
};
