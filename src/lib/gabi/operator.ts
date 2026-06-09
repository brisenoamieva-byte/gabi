import { GABI_OPERADOR } from "@/lib/gabi/ecosystem";

/** Correos con acceso de operador gabi (cerebro integral). */
const OPERATOR_EMAILS = new Set(
  [
    GABI_OPERADOR.email,
    "ricardo@bbrhabitarea.com",
    "rbriseno@bbrhabitarea.com",
    process.env.NEXT_PUBLIC_GABI_OPERATOR_EMAIL,
  ]
    .filter(Boolean)
    .map((e) => e!.toLowerCase()),
);

export type OperatorSessionLike = {
  email?: string | null;
  rol?: string | null;
};

/**
 * Operador gabi: control integral (propuestas, estudios privados, admin).
 * Incluye a Ricardo Briseño y roles director en portal BBR.
 */
export function isGabiOperator(session: OperatorSessionLike | null | undefined): boolean {
  if (!session?.email) {
    return false;
  }
  const email = session.email.toLowerCase();
  if (OPERATOR_EMAILS.has(email)) {
    return true;
  }
  return session.rol === "director";
}

export function requireOperatorMessage(): string {
  return "Esta sección es del operador gabi. Inicia sesión con tu cuenta de director.";
}
