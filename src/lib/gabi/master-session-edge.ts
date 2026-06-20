import { parseMasterSessionToken } from "@/lib/gabi/master-session-token";

const getSecret = () =>
  process.env.GABI_MASTER_SESSION_SECRET?.trim() ??
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
  "gabi-master-dev-secret";

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const hmacSha256Base64Url = async (secret: string, message: string): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
};

/** Verificación HMAC compatible con Edge (middleware). */
export async function verifyMasterSessionValueEdge(
  value: string | undefined | null,
): Promise<string | null> {
  const parsed = parseMasterSessionToken(value);
  if (!parsed) {
    return null;
  }

  const payload = `${parsed.encoded}.${parsed.expStr}`;
  const expected = await hmacSha256Base64Url(getSecret(), payload);

  if (expected.length !== parsed.sig.length || expected !== parsed.sig) {
    return null;
  }

  return parsed.email;
}
