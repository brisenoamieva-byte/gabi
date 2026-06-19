"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readStoredAsesorSession } from "@/lib/asesores/session-client";
import {
  GABI_CENTRO_PATH,
  OPERATOR_LOGIN_PATH,
} from "@/lib/gabi/operator";
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

  const loginHref = useMemo(() => {
    const next = options.nextPath;
    if (next) {
      return `${OPERATOR_LOGIN_PATH}?next=${encodeURIComponent(next)}`;
    }
    return OPERATOR_LOGIN_PATH;
  }, [options.nextPath]);

  useEffect(() => {
    const session = readStoredAsesorSession();
    setHasSession(Boolean(session));
    setAuthReady(true);
    if (!session) {
      router.replace(loginHref);
    }
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
