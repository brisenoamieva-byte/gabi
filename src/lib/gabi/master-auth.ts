import { timingSafeEqual } from "node:crypto";
import { isGabiOperator } from "@/lib/gabi/operator";

function secretsEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) {
      return false;
    }
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/** Contraseña maestra del operador/dueño (Vercel: GABI_MASTER_PASSWORD). */
export function resolveMasterPassword(): string | null {
  const fromEnv = process.env.GABI_MASTER_PASSWORD?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "development") {
    return "Pantuflas21";
  }
  return null;
}

export function verifyMasterPassword(password: string): boolean {
  const expected = resolveMasterPassword();
  if (!expected) {
    return false;
  }
  return secretsEqual(password.trim(), expected);
}

export function verifyGabiOwnerAccess(email: string, password: string): boolean {
  if (!isGabiOperator({ email })) {
    return false;
  }
  return verifyMasterPassword(password);
}
