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

export function logoutAsesorSession(
  router: RouterLike,
  options?: { clearPortal?: boolean; redirect?: string },
) {
  const portal = readPortalSession();
  void fetch("/api/asesores/auth/logout", { method: "POST" }).catch(() => undefined);
  localStorage.removeItem(GABI_USER_KEY);
  localStorage.removeItem(GABI_DESARROLLO_KEY);
  if (options?.clearPortal) {
    localStorage.removeItem(PORTAL_STORAGE_KEY);
  }
  router.replace(
    options?.redirect ?? (portal ? resolveAdvisorEntryPath(portal) : "/portal"),
  );
}

export function clearSelectedDesarrollo(router: RouterLike) {
  localStorage.removeItem(GABI_DESARROLLO_KEY);
  (router.push ?? router.replace).call(router, "/desarrollos");
}
