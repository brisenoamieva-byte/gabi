import { timingSafeEqual } from "node:crypto";
import type { AsesorSession } from "@/lib/asesores/types";
import { verifyMasterPassword } from "@/lib/gabi/master-auth";
import { GABI_OPERADOR } from "@/lib/gabi/ecosystem";

function codesEqual(a: string, b: string): boolean {
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

/** Contraseña maestra del operador (misma en /operador, /admin y editor NUBO). */
export function verifyOperatorAccessCode(code: string): boolean {
  if (verifyMasterPassword(code)) {
    return true;
  }

  const legacy = process.env.GABI_OPERATOR_ACCESS_CODE?.trim();
  if (legacy) {
    return codesEqual(code.trim(), legacy);
  }

  if (process.env.NODE_ENV === "development") {
    return codesEqual(code.trim(), "gabi-operador");
  }

  return false;
}

export function buildOperatorSession(email: string): AsesorSession {
  const normalized = email.trim().toLowerCase();
  return {
    id: "operador-gabi",
    nombre: GABI_OPERADOR.nombre,
    email: normalized,
    rol: "director",
    desarrollosIds: [],
  };
}
