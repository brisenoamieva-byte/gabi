import { createHmac, timingSafeEqual } from "node:crypto";

export const ASESOR_SESSION_COOKIE = "gabi_asesor_session";
export const ASESOR_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const resolveSecret = (): string | null => {
  const fromEnv = process.env.ASESOR_SESSION_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "asesor-session-dev-secret";
};

export const signAsesorSession = (asesorId: string) => {
  const secret = resolveSecret();
  if (!secret) {
    throw new Error(
      "ASESOR_SESSION_SECRET es obligatorio en producción. Configúralo en Vercel.",
    );
  }

  const id = asesorId.trim();
  const exp = Date.now() + ASESOR_SESSION_MS;
  const payload = `${id}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
};

/**
 * Formato: `{asesorId}.{exp}.{sig}`.
 * El asesorId puede contener puntos (ej. ignacio.underwood); exp y sig son siempre
 * los dos segmentos finales.
 */
export const verifyAsesorSessionValue = (value: string | undefined | null): string | null => {
  if (!value) {
    return null;
  }

  const secret = resolveSecret();
  if (!secret) {
    return null;
  }

  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) {
    return null;
  }
  const secondLastDot = value.lastIndexOf(".", lastDot - 1);
  if (secondLastDot <= 0) {
    return null;
  }

  const asesorId = value.slice(0, secondLastDot);
  const expStr = value.slice(secondLastDot + 1, lastDot);
  const sig = value.slice(lastDot + 1);
  const exp = Number(expStr);
  if (!asesorId || !sig || !Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }

  const payload = `${asesorId}.${expStr}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return asesorId;
};

export const asesorSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ASESOR_SESSION_MS / 1000,
});
