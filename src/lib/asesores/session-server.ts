import { cookies } from "next/headers";
import {
  ASESOR_SESSION_COOKIE,
  verifyAsesorSessionValue,
} from "@/lib/asesores/session-cookie";

export const getAsesorIdFromSession = (): string | null => {
  const cookieStore = cookies();
  return verifyAsesorSessionValue(cookieStore.get(ASESOR_SESSION_COOKIE)?.value);
};

export const requireAsesorIdFromSession = (): string => {
  const asesorId = getAsesorIdFromSession();
  if (!asesorId) {
    throw new Error("ASESOR_SESSION_REQUIRED");
  }
  return asesorId;
};

/** Rechaza si el cliente envía un asesorId distinto al de la cookie. */
export const assertAsesorIdMatchesSession = (claimedAsesorId: string | null | undefined): string => {
  const sessionAsesorId = requireAsesorIdFromSession();
  const claimed = claimedAsesorId?.trim();
  if (claimed && claimed !== sessionAsesorId) {
    throw new Error("ASESOR_SESSION_MISMATCH");
  }
  return sessionAsesorId;
};
