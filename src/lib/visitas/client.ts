import type { VisitaInput } from "@/lib/visitas/types";

export type TrackVisitaResult = {
  emailSent?: boolean;
  emailReason?: string;
  error?: string;
};

export const trackVisita = async (input: VisitaInput): Promise<TrackVisitaResult> => {
  try {
    const response = await fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as TrackVisitaResult & { error?: string };

    if (!response.ok) {
      return { error: data.error ?? "No se pudo registrar la visita." };
    }

    return {
      emailSent: data.emailSent,
      emailReason: data.emailReason,
    };
  } catch {
    return { error: "Error de red al registrar la visita." };
  }
};
