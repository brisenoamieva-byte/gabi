import { timingSafeEqual } from "node:crypto";
import type { AsesorSession } from "@/lib/asesores/types";
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

export function verifyOperatorAccessCode(code: string): boolean {
  const secret = process.env.GABI_OPERATOR_ACCESS_CODE?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return codesEqual(code.trim(), "gabi-operador");
    }
    return false;
  }
  return codesEqual(code.trim(), secret);
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
