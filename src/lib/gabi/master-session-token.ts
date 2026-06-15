const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export { SESSION_MS };

export function encodeSessionEmail(email: string): string {
  return Buffer.from(email.trim().toLowerCase(), "utf8").toString("base64url");
}

export function decodeSessionEmail(encoded: string): string | null {
  try {
    const value = Buffer.from(encoded, "base64url").toString("utf8").trim().toLowerCase();
    return value.includes("@") ? value : null;
  } catch {
    return null;
  }
}

export function parseMasterSessionToken(value: string | undefined | null): {
  encoded: string;
  expStr: string;
  sig: string;
  email: string;
  exp: number;
} | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [encoded, expStr, sig] = parts;
  const exp = Number(expStr);
  const email = decodeSessionEmail(encoded);

  if (!encoded || !sig || !email || !Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }

  return { encoded, expStr, sig, email, exp };
}

/** Fast parse for middleware (HMAC verified later in API routes). */
export function peekMasterSessionEmail(value: string | undefined | null): string | null {
  return parseMasterSessionToken(value)?.email ?? null;
}
