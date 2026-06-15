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

const DEFAULT_MASTER_PASSWORD = "Pantuflas21";

/** Contraseña maestra del operador/dueño (opcional: GABI_MASTER_PASSWORD en Vercel). */
export function resolveMasterPassword(): string {
  const fromEnv = process.env.GABI_MASTER_PASSWORD?.trim();
  return fromEnv || DEFAULT_MASTER_PASSWORD;
}

export function verifyMasterPassword(password: string): boolean {
  return secretsEqual(password.trim(), resolveMasterPassword());
}

export function verifyGabiOwnerAccess(email: string, password: string): boolean {
  if (!isGabiOperator({ email })) {
    return false;
  }
  return verifyMasterPassword(password);
}
