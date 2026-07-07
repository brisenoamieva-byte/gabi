"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  readStoredAsesorSession,
  refreshStoredAsesorSession,
} from "@/lib/asesores/session-client";
import {
  GABI_CENTRO_PATH,
} from "@/lib/gabi/operator";
import { operatorLoginHref } from "@/lib/gabi/operator-login-url";
import { useGabiOperator } from "@/components/gabi/useGabiOperator";

type Options = {
  /** Ruta a restaurar tras login (default: ninguna). */
  nextPath?: string;
  /** Exige operador gabi (propuestas, estudios, corredor). */
  requireOperator?: boolean;
};

export function useRequireGabiSession(options: Options = {}) {
  const router = useRouter();
  const { ready: operatorReady, isOperator, user } = useGabiOperator();
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const loginHref = useMemo(
    () => operatorLoginHref(options.nextPath),
    [options.nextPath],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let session = readStoredAsesorSession();

      if (!session) {
        session = await refreshStoredAsesorSession();
      }

      if (cancelled) {
        return;
      }

      setHasSession(Boolean(session));
      setAuthReady(true);

      if (!session) {
        if (loginHref.startsWith("http")) {
          window.location.assign(loginHref);
          return;
        }
        router.replace(loginHref);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, loginHref]);

  const operatorOk = !options.requireOperator || isOperator;

  return {
    authReady: authReady && operatorReady,
    hasSession,
    isOperator,
    operatorOk,
    user,
    loginHref,
    centroHref: GABI_CENTRO_PATH,
  };
}
