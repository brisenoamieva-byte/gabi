import { createHmac, timingSafeEqual } from "node:crypto";

export const GABI_MASTER_COOKIE = "gabi_master_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const getSecret = () =>
  process.env.GABI_MASTER_SESSION_SECRET?.trim() ??
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
  "gabi-master-dev-secret";

export const signMasterSession = (email: string) => {
  const normalized = email.trim().toLowerCase();
  const exp = Date.now() + SESSION_MS;
  const payload = `${normalized}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
};

/** Parse cookie shape/expiry only (middleware). HMAC checked in verifyMasterSessionValue. */
export const peekMasterSessionEmail = (value: string | undefined | null): string | null => {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [email, expStr] = parts;
  const exp = Number(expStr);
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;

  return email;
};

export const verifyMasterSessionValue = (value: string | undefined | null): string | null => {
  const email = peekMasterSessionEmail(value);
  if (!email || !value) return null;

  const parts = value.split(".");
  const [, expStr, sig] = parts;
  const payload = `${email}.${expStr}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return email;
};

export const masterSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MS / 1000,
});
