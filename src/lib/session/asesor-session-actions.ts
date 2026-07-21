import { markAsesorExplicitLogout } from "@/lib/asesores/session-client";
import {
  PORTAL_STORAGE_KEY,
  readPortalSession,
  resolveAdvisorEntryPath,
} from "@/lib/portal/session";
import { GABI_DESARROLLO_KEY, GABI_USER_KEY } from "@/lib/session/keys";

type RouterLike = {
  replace: (path: string) => void;
  push?: (path: string) => void;
};

export async function logoutAsesorSession(
  router: RouterLike,
  options?: { clearPortal?: boolean; redirect?: string },
) {
  const portal = readPortalSession();
  markAsesorExplicitLogout();
  localStorage.removeItem(GABI_USER_KEY);
  localStorage.removeItem(GABI_DESARROLLO_KEY);
  if (options?.clearPortal) {
    localStorage.removeItem(PORTAL_STORAGE_KEY);
  }

  try {
    await fetch("/api/asesores/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Continuar al PIN aunque falle la red; la bandera evita reentrada.
  }

  router.replace(
    options?.redirect ?? (portal ? resolveAdvisorEntryPath(portal) : "/portal"),
  );
}

export function clearSelectedDesarrollo(router: RouterLike) {
  localStorage.removeItem(GABI_DESARROLLO_KEY);
  (router.push ?? router.replace).call(router, "/desarrollos");
}
