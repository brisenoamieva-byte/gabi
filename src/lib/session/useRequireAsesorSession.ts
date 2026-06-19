"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  readStoredAsesorSession,
  refreshStoredAsesorSession,
} from "@/lib/asesores/session-client";
import type { AsesorSession } from "@/lib/asesores/types";
import type { Desarrollo } from "@/lib/data";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
  type PortalSession,
} from "@/lib/portal/session";
import { GABI_DESARROLLO_KEY, GABI_USER_KEY } from "@/lib/session/keys";

type Options = {
  /** Si true (default), exige desarrollo seleccionado y lo carga del catálogo. */
  requireDesarrollo?: boolean;
  /** Si true, exige sesión de portal BBR (selector de comercializadora). */
  requirePortal?: boolean;
  /** Si false, omite validación (p. ej. flujo admin con otra auth). */
  enabled?: boolean;
  /** Ruta si no hay sesión de asesor (default: portal o /portal). */
  unauthenticatedRedirect?: string;
};

export function useRequireAsesorSession(options: Options = {}) {
  const requireDesarrollo = options.requireDesarrollo !== false;
  const requirePortal = options.requirePortal === true;
  const enabled = options.enabled !== false;
  const unauthenticatedRedirect = options.unauthenticatedRedirect;
  const router = useRouter();
  const [authReady, setAuthReady] = useState(!enabled);
  const [user, setUser] = useState<AsesorSession | null>(null);
  const [desarrollo, setDesarrollo] = useState<Desarrollo | null>(null);
  const [portal, setPortal] = useState<PortalSession | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAuthReady(true);
      return;
    }

    setAuthReady(false);
    const portalSession = readPortalSession();

    if (requirePortal && !portalSession) {
      router.replace("/portal");
      return;
    }

    const stored = readStoredAsesorSession();
    const storedDevelopment = localStorage.getItem(GABI_DESARROLLO_KEY);

    if (!stored) {
      router.replace(
        unauthenticatedRedirect ??
          (portalSession ? resolveAdvisorEntryPath(portalSession) : "/portal"),
      );
      return;
    }

    if (requireDesarrollo && !storedDevelopment) {
      router.replace("/desarrollos");
      return;
    }

    const load = async () => {
      try {
        const freshUser = (await refreshStoredAsesorSession(stored)) ?? stored;

        if (requireDesarrollo && storedDevelopment) {
          if (!freshUser.desarrollosIds.includes(storedDevelopment)) {
            localStorage.removeItem(GABI_DESARROLLO_KEY);
            router.replace("/desarrollos");
            return;
          }

          const response = await fetch(
            `/api/catalog/desarrollos?ids=${encodeURIComponent(storedDevelopment)}`,
          );
          const data = (await response.json()) as { desarrollos?: Desarrollo[] };
          const selected = data.desarrollos?.[0];

          if (!selected) {
            localStorage.removeItem(GABI_DESARROLLO_KEY);
            router.replace("/desarrollos");
            return;
          }

          setDesarrollo(selected);
        }

        if (portalSession) {
          setPortal(portalSession);
        }

        setUser(freshUser);
        setAuthReady(true);
      } catch {
        localStorage.removeItem(GABI_USER_KEY);
        localStorage.removeItem(GABI_DESARROLLO_KEY);
        router.replace(
          portalSession ? resolveAdvisorEntryPath(portalSession) : "/portal",
        );
      }
    };

    void load();
  }, [router, requireDesarrollo, requirePortal, enabled, unauthenticatedRedirect]);

  return { authReady, user, desarrollo, portal, enabled };
}
