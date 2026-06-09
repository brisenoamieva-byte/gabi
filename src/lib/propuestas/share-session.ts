import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_PREFIX = "propuesta_share_";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const getSecret = () =>
  process.env.PROPUESTA_SHARE_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "propuesta-share-dev-secret";

export const getShareCookieName = (token: string) => `${COOKIE_PREFIX}${token}`;

export const signShareSession = (token: string) => {
  const exp = Date.now() + SESSION_MS;
  const payload = `${token}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
};

export const verifyShareSession = (token: string, value: string | undefined | null) => {
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const [sessionToken, expStr, sig] = parts;
  if (sessionToken !== token) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const payload = `${sessionToken}.${expStr}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
};

export const shareSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MS / 1000,
});
