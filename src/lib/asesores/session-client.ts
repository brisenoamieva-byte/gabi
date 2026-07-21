import type { AsesorSession } from "@/lib/asesores/types";
import type { PortalSession } from "@/lib/portal/session";
import { PORTAL_STORAGE_KEY } from "@/lib/portal/session";
import { GABI_ASESOR_LOGOUT_FLAG, GABI_USER_KEY } from "@/lib/session/keys";

const USER_STORAGE_KEY = GABI_USER_KEY;

export const markAsesorExplicitLogout = () => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(GABI_ASESOR_LOGOUT_FLAG, "1");
};

export const clearAsesorExplicitLogout = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(GABI_ASESOR_LOGOUT_FLAG);
};

export const hasAsesorExplicitLogout = (): boolean => {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(GABI_ASESOR_LOGOUT_FLAG) === "1";
};

export const readStoredAsesorSession = (): AsesorSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AsesorSession;
  } catch {
    return null;
  }
};

export const writeStoredAsesorSession = (asesor: AsesorSession) => {
  clearAsesorExplicitLogout();
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(asesor));
};

const fetchAsesorSessionFromServer = async (): Promise<AsesorSession | null> => {
  const response = await fetch("/api/asesores/session");
  const data = (await response.json()) as { asesor?: AsesorSession; error?: string };
  if (!response.ok || !data.asesor) {
    return null;
  }
  return data.asesor;
};

const fetchOperatorSessionFromServer = async (): Promise<AsesorSession | null> => {
  const response = await fetch("/api/gabi/operator/session", { credentials: "same-origin" });
  const data = (await response.json()) as { asesor?: AsesorSession; error?: string };
  if (!response.ok || !data.asesor) {
    return null;
  }
  return data.asesor;
};

export const refreshStoredAsesorSession = async (): Promise<AsesorSession | null> => {
  try {
    const fromPin = await fetchAsesorSessionFromServer();
    if (fromPin) {
      writeStoredAsesorSession(fromPin);
      return fromPin;
    }

    // Tras «Salir» explícito no reentrar con cookie de operador/admin.
    if (hasAsesorExplicitLogout()) {
      return null;
    }

    const fromOperator = await fetchOperatorSessionFromServer();
    if (fromOperator) {
      writeStoredAsesorSession(fromOperator);
      return fromOperator;
    }

    return null;
  } catch {
    return null;
  }
};

const parseSyncedAsesorResponse = async (
  response: Response,
): Promise<{ asesor: AsesorSession; portal: PortalSession | null } | null> => {
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    asesor?: AsesorSession;
    portal?: PortalSession | null;
  };

  if (!data.asesor) {
    return null;
  }

  writeStoredAsesorSession(data.asesor);
  if (data.portal) {
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(data.portal));
  }

  return { asesor: data.asesor, portal: data.portal ?? null };
};

/** Si el usuario ya entró con correo (admin), activa CRM de campo sin PIN. */
export const syncAsesorFromAdminAuth = async (opts?: {
  /** Ignora «Salir» de campo (login admin o enlace explícito a CRM). */
  allowAfterLogout?: boolean;
}): Promise<{
  asesor: AsesorSession;
  portal: PortalSession | null;
} | null> => {
  if (hasAsesorExplicitLogout() && !opts?.allowAfterLogout) {
    return null;
  }

  if (opts?.allowAfterLogout) {
    clearAsesorExplicitLogout();
  }

  try {
    const postResponse = await fetch("/api/acceso/sync-asesor", {
      method: "POST",
      credentials: "same-origin",
    });
    const fromPost = await parseSyncedAsesorResponse(postResponse);
    if (fromPost) {
      return fromPost;
    }

    const getResponse = await fetch("/api/acceso/sync-asesor", {
      credentials: "same-origin",
    });
    const fromGet = await parseSyncedAsesorResponse(getResponse);
    if (fromGet) {
      return fromGet;
    }

    return null;
  } catch {
    return null;
  }
};
