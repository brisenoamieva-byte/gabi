"use client";

import { useEffect } from "react";

/** Inicializa Sentry en el cliente solo si hay DSN público. */
export function ObservabilityInit() {
  useEffect(() => {
    void import("../../sentry.client.config");
  }, []);

  return null;
}
