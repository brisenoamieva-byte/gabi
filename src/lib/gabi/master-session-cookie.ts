import { createHmac, timingSafeEqual } from "node:crypto";
import { GABI_MASTER_COOKIE } from "@/lib/gabi/master-session-constants";
import {
  encodeSessionEmail,
  peekMasterSessionEmail,
  parseMasterSessionToken,
  SESSION_MS,
} from "@/lib/gabi/master-session-token";

export { GABI_MASTER_COOKIE, peekMasterSessionEmail, SESSION_MS };

const getSecret = () =>
  process.env.GABI_MASTER_SESSION_SECRET?.trim() ??
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
  "gabi-master-dev-secret";

export const signMasterSession = (email: string) => {
  const encoded = encodeSessionEmail(email);
  const exp = Date.now() + SESSION_MS;
  const payload = `${encoded}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
};

export const verifyMasterSessionValue = (value: string | undefined | null): string | null => {
  const parsed = parseMasterSessionToken(value);
  if (!parsed || !value) return null;

  const payload = `${parsed.encoded}.${parsed.expStr}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(parsed.sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return parsed.email;
};

export const masterSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MS / 1000,
});
