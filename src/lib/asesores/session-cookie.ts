import { createHmac, timingSafeEqual } from "node:crypto";

export const ASESOR_SESSION_COOKIE = "gabi_asesor_session";
export const ASESOR_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const getSecret = () =>
  process.env.ASESOR_SESSION_SECRET?.trim() ??
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
  "asesor-session-dev-secret";

export const signAsesorSession = (asesorId: string) => {
  const id = asesorId.trim();
  const exp = Date.now() + ASESOR_SESSION_MS;
  const payload = `${id}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
};

export const verifyAsesorSessionValue = (value: string | undefined | null): string | null => {
  if (!value) {
    return null;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [asesorId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!asesorId || !sig || !Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }

  const payload = `${asesorId}.${expStr}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");

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
